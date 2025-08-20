import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Jira API request')
    const supabase = await createClient()
    const requestData = await request.json()
    console.log('📥 Request data received:', { action: requestData.action, hasCredentials: !!requestData.credentials })
    
    const { credentials, action } = requestData
    
    // If it's a sync action, use stored credentials, otherwise use direct credentials
    const { jiraUrl, username, apiToken, projectName, issueType, fetchLimit } = action === 'sync' 
      ? credentials 
      : requestData as { jiraUrl: string; username: string; apiToken: string; projectName: string; issueType: string; fetchLimit?: number }

    console.log('🔧 Using credentials:', { jiraUrl, username: username ? '***' : 'missing', apiToken: apiToken ? '***' : 'missing', projectName, issueType, fetchLimit: fetchLimit || 200 })

    // 1. Validate Jira credentials
    console.log('🔐 Validating Jira credentials...')
    const authHeader = `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`
    
    try {
      const jiraValidationRes = await fetch(`${jiraUrl}/rest/api/2/myself`, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      })

      console.log('📊 Jira validation response status:', jiraValidationRes.status)
      
      if (!jiraValidationRes.ok) {
        const errorText = await jiraValidationRes.text()
        console.error('❌ Jira validation failed:', { status: jiraValidationRes.status, error: errorText })
        return NextResponse.json({ error: 'Invalid Jira credentials', details: errorText }, { status: 401 })
      }
      
      console.log('✅ Jira credentials validated successfully')
    } catch (jiraError) {
      console.error('❌ Jira validation network error:', jiraError)
      return NextResponse.json({ 
        error: 'Failed to connect to Jira', 
        details: jiraError instanceof Error ? jiraError.message : 'Unknown error' 
      }, { status: 502 })
    }
    // List available projects
    const projRes = await fetch(`${jiraUrl}/rest/api/3/project/search`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    })
    const projects = await projRes.json()
    console.log('🔍 Available projects:', projects?.values?.map((p: any) => p.key).slice(0, 10))
    // 2. Get current user
    console.log('👤 Getting current user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError)
      return NextResponse.json({ error: 'Unauthorized', details: userError?.message }, { status: 401 })
    }
    console.log('✅ User authenticated:', user.id)

    // 3. Get user preferences for trigger timing, variations, and styles
    console.log('⚙️ Fetching user preferences...')
    const { data: userPreferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('trigger_timing, number_of_variations, styles')
      .eq('user_id', user.id)
      .single()

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.error('❌ Error fetching user preferences:', preferencesError)
    } else {
      console.log('✅ User preferences fetched:', userPreferences || 'Using defaults')
    }

    // Use defaults if no preferences found
    const triggerTiming = userPreferences?.trigger_timing || '2 days'
    const numberOfVariations = userPreferences?.number_of_variations || 1
    const userStyles = userPreferences?.styles || ['Lifestyle + Subject'] // Default style
    console.log('📋 Using preferences:', { triggerTiming, numberOfVariations, userStyles })

    // Helper function to calculate trigger times based on user preferences
    const calculateTriggerTimes = (dueDate: Date | null, triggerTiming: string): { trigger_start: string | null, trigger_end: string | null } => {
      if (!dueDate) return { trigger_start: null, trigger_end: null }
      
      let daysToSubtract = 2 // default
      
      switch (triggerTiming) {
        case '2 days':
          daysToSubtract = 2
          break
        case '3 days':
          daysToSubtract = 3
          break
        case '1 week':
          daysToSubtract = 7
          break
        case '2 weeks':
          daysToSubtract = 14
          break
        default:
          daysToSubtract = 2
      }
      
      const triggerDate = new Date(dueDate.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000))
      
      // Set trigger_start to start of day (00:00:00)
      const triggerStart = new Date(triggerDate)
      triggerStart.setUTCHours(0, 0, 0, 0)
      
      // Set trigger_end to end of day (23:59:59)
      const triggerEnd = new Date(triggerDate)
      triggerEnd.setUTCHours(23, 59, 59, 999)
      
      return {
        trigger_start: triggerStart.toISOString(),
        trigger_end: triggerEnd.toISOString()
      }
    }



    // 6. Query Jira for issues (optimized with existing issue exclusion)
    console.log('🔍 Querying Jira for issues...')

    let jql: string
    let syncStrategy: string
    let existingIssueIds: string[] = []

    if (action === 'sync') {
      // Get existing issue IDs from database to exclude from Jira query
      console.log('📋 Fetching existing issue IDs to exclude...')
      const { data: existingEvents, error: existingError } = await supabase
        .from('calendar_events')
        .select('external_event_id')
        .eq('user_id', user.id)

      if (existingError) {
        console.error('⚠️ Error fetching existing events:', existingError)
        // Continue with full sync if we can't get existing IDs
      } else {
        existingIssueIds = existingEvents?.map(event => event.external_event_id) || []
        console.log(`📊 Found ${existingIssueIds.length} existing issues to exclude`)
      }

      if (existingIssueIds.length > 0) {
        // Incremental sync: Exclude issues we already have
        // Limit to avoid JQL length issues (Jira has ~8KB JQL limit)
        const maxExcludeIds = 200 // Conservative limit to avoid JQL length issues
        const idsToExclude = existingIssueIds.slice(0, maxExcludeIds)
        const excludeClause = idsToExclude.map(id => `"${id}"`).join(', ')
        jql = `project = "${projectName}" AND issuetype = "${issueType}" AND due > startOfMonth() AND due < endOfMonth() AND key NOT IN (${excludeClause})`
        syncStrategy = 'incremental'
        
        if (existingIssueIds.length > maxExcludeIds) {
          console.log(`⚡ Using incremental sync excluding ${idsToExclude.length} of ${existingIssueIds.length} existing issues (JQL limit)`)
        } else {
          console.log('⚡ Using incremental sync excluding', existingIssueIds.length, 'existing issues')
        }
      } else {
        // No existing issues, do full sync
        jql = `project = "${projectName}" AND issuetype = "${issueType}" AND due > startOfMonth() AND due < endOfMonth()`
        syncStrategy = 'full'
        console.log('🔄 Using full sync (no existing issues found)')
      }
    } else {
      // Full sync: Get all issues for current month (connect action)
      jql = `project = "${projectName}" AND issuetype = "${issueType}" AND due > startOfMonth() AND due < endOfMonth()`
      syncStrategy = 'full'
      console.log('🔄 Using full sync (forced or initial connection)')
    }

    console.log('📝 Using JQL:', jql)
    console.log('🎯 Sync strategy:', syncStrategy)

    const issues: any[] = []
    const maxResults = fetchLimit || 200 // Use user's fetch limit or default to 200

    try {
      console.log(`🔄 Fetching issues (limited to ${maxResults} results)`)
      
      const res = await fetch(`${jiraUrl}/rest/api/3/search`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          jql,
          fields: ['summary', 'duedate', 'issuetype'],
          maxResults: maxResults,
          startAt: 0
        })
      })

      console.log('📊 Jira search response status:', res.status)

      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ Failed to fetch Jira issues:', { status: res.status, error: errorText })
        return NextResponse.json({ 
          error: 'Failed to fetch Jira issues', 
          details: errorText,
          jql:jql
        }, { status: 502 })
      }

      const json = await res.json()
      console.log('📋 Fetched issues:', { count: json.issues?.length || 0, total: json.total, limited_to: maxResults })
      
      if (json.issues && json.issues.length > 0) {
        issues.push(...json.issues)
      }

      console.log('✅ Total issues fetched:', issues.length)
      
      if (issues.length === 0) {
        console.log('⚠️ No issues found with the specified criteria')
        return NextResponse.json({ 
          success: true, 
          message: `No ${issueType} issues found in project ${projectName} for the current month`,
          total_fetched: 0,
          newly_inserted: 0,
          skipped_existing: 0
        })
      }
    } catch (jiraFetchError) {
      console.error('❌ Network error while fetching Jira issues:', jiraFetchError)
      return NextResponse.json({ 
        error: 'Network error while fetching Jira issues', 
        details: jiraFetchError instanceof Error ? jiraFetchError.message : 'Unknown error'
      }, { status: 502 })
    }

    // Only create database records after successful Jira data fetch
    console.log('💾 Storing Jira integration after successful fetch...')
    const { error: integrationError } = await supabase
      .from('external_integrations')
      .upsert({
        user_id: user.id,
        type: 'JIRA',
        config: {
          domain: jiraUrl,
          username,
          apiKey: apiToken,
          projectName,
          issueType
        },
        last_synced: new Date().toISOString().split('T')[0]
      }, { onConflict: 'user_id,type' })

    if (integrationError) {
      console.error('❌ Error storing Jira credentials:', integrationError)
      return NextResponse.json({ error: 'Failed to store integration', details: integrationError.message }, { status: 500 })
    }
    console.log('✅ Jira integration stored successfully')

    // Create or get the Jira calendar (only after successful Jira fetch)
    console.log('📅 Setting up Jira calendar...')
    
    // First try to find calendar by project name in config
    const { data: existingCalendar, error: calendarSelectError } = await supabase
      .from('calendars')
      .select('id, name, config, fetch_limit')
      .eq('user_id', user.id)
      .eq('provider', 'JIRA')

    let calendarId: string
    let foundCalendar = null

    // Look for existing calendar with matching project in config
    if (!calendarSelectError && existingCalendar) {
      for (const calendar of existingCalendar) {
        if (calendar.config && calendar.config.projectName === projectName) {
          foundCalendar = calendar
          break
        }
      }
    }

    if (foundCalendar) {
      // Use existing calendar
      calendarId = foundCalendar.id
      console.log('✅ Using existing Jira calendar:', calendarId, 'with name:', foundCalendar.name)
    } else {
      // Calendar doesn't exist, create it
      console.log('🆕 Creating new Jira calendar...')
      const { data: newCalendar, error: calendarInsertError } = await supabase
        .from('calendars')
        .insert({
          user_id: user.id,
          provider: 'JIRA',
          name: `${projectName}`, // Use project name for calendar name
          timezone: 'UTC',
          config: { jiraUrl, projectName, issueType },
          last_synced: new Date().toISOString()
        })
        .select('id')
        .single()

      if (calendarInsertError || !newCalendar) {
        console.error('❌ Error creating calendar:', calendarInsertError)
        return NextResponse.json({ error: 'Failed to create calendar', details: calendarInsertError?.message }, { status: 500 })
      }

      calendarId = newCalendar.id
      console.log('✅ Jira calendar created:', calendarId)
    }

    // 7. Process and insert only new events into calendar_events
    console.log('🔄 Processing fetched issues into calendar events...')
    const entries = issues.map(issue => {
      const fields = issue.fields

      // Calculate trigger times based on user preferences
      const dueDate = fields.duedate ? new Date(fields.duedate) : null
      const { trigger_start, trigger_end } = calculateTriggerTimes(dueDate, triggerTiming)

      console.log(`📝 Processing issue: ${issue.key} - ${fields.summary}`)

      return {
        user_id: user.id,
        calendar_id: calendarId,
        external_event_id: issue.key,
        summary: fields.summary,
        description: null, // Leave description empty as requested
        due_date: fields.duedate || null,
        trigger_start,
        trigger_end,
        raw_data: issue,
        status: 'pending' as const,
        fetched_at: new Date().toISOString(),
        tags: [], // Keep tags array empty as requested
        number_of_variations: numberOfVariations,
        styles: userStyles, // Include user's creative styles from preferences
        color: 'amber' // Set default amber color for all Jira events
      }
    })

    // Insert events (already filtered to exclude existing ones at query level)
    console.log('💾 Processing calendar events...')
    console.log('📋 Using calendar ID:', calendarId)
    console.log('📊 Total new events to process:', entries.length)
    
    let insertedCount = 0
    let skippedCount = 0
    
    if (syncStrategy === 'incremental' && entries.length === 0) {
      console.log('✅ No new issues found - database is up to date!')
      skippedCount = existingIssueIds.length // Count existing issues as "skipped"
    } else {
      // Batch insert all new events (they're guaranteed to be new due to JQL filtering)
      if (entries.length > 0) {
        console.log('➕ Batch inserting', entries.length, 'new events...')
        const { data: insertedEvents, error: insertError } = await supabase
          .from('calendar_events')
          .insert(entries)
          .select('id, external_event_id')

        if (insertError) {
          console.error('❌ Batch insert failed:', insertError)
          // Fallback to individual inserts
          for (const entry of entries) {
            const { error: singleInsertError } = await supabase
              .from('calendar_events')
              .insert(entry)

            if (singleInsertError) {
              console.error('❌ Individual insert failed for:', entry.external_event_id, singleInsertError)
            } else {
              console.log('➕ Inserted event:', entry.external_event_id)
              insertedCount++
            }
          }
        } else {
          insertedCount = insertedEvents?.length || entries.length
          console.log('✅ Successfully inserted', insertedCount, 'new events')
        }
      }
      
      // For incremental sync, count existing issues as skipped
      if (syncStrategy === 'incremental') {
        skippedCount = existingIssueIds.length
      }
    }

    console.log('✅ Event processing complete:', { insertedCount, skippedCount, totalProcessed: entries.length })

    // Update last_synced timestamp for incremental sync optimization
    const { error: updateSyncError } = await supabase
      .from('external_integrations')
      .update({ last_synced: new Date().toISOString().split('T')[0] })
      .eq('user_id', user.id)
      .eq('type', 'JIRA')

    if (updateSyncError) {
      console.error('⚠️ Failed to update last_synced timestamp:', updateSyncError)
    } else {
      console.log('✅ Updated last_synced timestamp')
    }

    return NextResponse.json({ 
      success: true, 
      sync_strategy: syncStrategy,
      total_fetched: entries.length,
      newly_inserted: insertedCount,
      skipped_existing: skippedCount,
      message: syncStrategy === 'incremental' 
        ? `Incremental sync completed - checked ${entries.length} updated/new issues`
        : `Full sync completed - processed ${entries.length} issues`
    })
  } catch (error) {
    console.error('❌ Unhandled error in Jira API:', error)
    if (error instanceof Error) {
      console.error('❌ Error stack:', error.stack)
    }
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.constructor.name : 'Unknown'
    }, { status: 500 })
  }
}
