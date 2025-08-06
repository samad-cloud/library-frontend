import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const requestData = await request.json()
    const { credentials, action } = requestData
    
    // If it's a sync action, use stored credentials, otherwise use direct credentials
    const { jiraUrl, username, apiToken } = action === 'sync' 
      ? credentials 
      : requestData as { jiraUrl: string; username: string; apiToken: string }

    // 1. Validate Jira credentials
    const authHeader = `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`
    const jiraValidationRes = await fetch(`${jiraUrl}/rest/api/2/myself`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })

    if (!jiraValidationRes.ok) {
      return NextResponse.json({ error: 'Invalid Jira credentials' }, { status: 401 })
    }

    // 2. Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Fetch org_id from users table
    const { data: userProfile, error: orgError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (orgError || !userProfile?.org_id) {
      console.error('Error fetching org_id:', orgError)
      return NextResponse.json({ error: 'Failed to retrieve org_id' }, { status: 500 })
    }

    const orgId = userProfile.org_id

    // 4. Upsert Jira credentials to external_integrations
    const { error: integrationError } = await supabase
      .from('external_integrations')
      .upsert({
        user_id: user.id,
        org_id: orgId,
        type: 'jira',
        config: {
          url: jiraUrl,
          username,
          api_token: apiToken
        },
        is_active: true,
        last_synced: new Date().toISOString()
      }, {
        onConflict: 'user_id,org_id,type'
      })

    if (integrationError) {
      console.error('Error storing Jira credentials:', integrationError)
      return NextResponse.json({ error: 'Failed to store integration' }, { status: 500 })
    }

    // 5. Query Jira for issues in the given year

    // Get current month's start and end dates
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const jql = `project ="EMCP" AND issuetype = "Email" AND due > startOfMonth() AND due < endOfMonth()`;

    const issues: any[] = []
    let startAt = 0
    const maxResults = 100

    while (true) {
      const res = await fetch(`${jiraUrl}/rest/api/3/search`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          jql,
          fields: ['summary', 'description', 'duedate', 'issuetype']
        })
      })

      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch Jira issues' }, { status: 502 })
      }

      const json = await res.json()
      if (!json.issues || json.issues.length === 0) break

      issues.push(...json.issues)
      startAt += maxResults
      if (startAt >= json.total) break
    }

    // 6. Process and upsert events into calendar_events
    const entries = issues.map(issue => {
      const fields = issue.fields
      let description = 'No description'

      if (typeof fields.description === 'object' && fields.description?.content) {
        description = fields.description.content
          .filter((p: any) => p.type === 'paragraph')
          .map((p: any) =>
            p.content?.filter((c: any) => c.type === 'text')?.map((c: any) => c.text).join('')
          ).join('\n') || 'No description'
      } else if (typeof fields.description === 'string') {
        description = fields.description
      }

      return {
        user_id: user.id,
        org_id: orgId,
        event_id: issue.key,
        summary: fields.summary,
        description,
        due_date: fields.duedate,
        issue_type: fields.issuetype.name,
        raw_data: issue
      }
    })

    // For each event, check if it exists and if there are changes
    for (const entry of entries) {
      const { data: existingEvent } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_id', entry.event_id)
        .single()

      if (!existingEvent) {
        // New event, insert it
        const { error: insertError } = await supabase
          .from('calendar_events')
          .insert(entry)

        if (insertError) {
          console.error('Insert failed for event:', entry.event_id, insertError)
          continue
        }
      } else if (
        existingEvent.summary !== entry.summary ||
        existingEvent.description !== entry.description ||
        existingEvent.due_date !== entry.due_date
      ) {
        // Event exists but has changes, update it
        const { error: updateError } = await supabase
          .from('calendar_events')
          .update({
            summary: entry.summary,
            description: entry.description,
            due_date: entry.due_date,
            issue_type: entry.issue_type,
            raw_data: entry.raw_data
          })
          .eq('user_id', user.id)
          .eq('event_id', entry.event_id)

        if (updateError) {
          console.error('Update failed for event:', entry.event_id, updateError)
          continue
        }
      }
    }

    return NextResponse.json({ success: true, inserted: entries.length })
  } catch (error) {
    console.error('Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
