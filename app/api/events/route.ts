import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const eventData = await request.json()
    
    console.log('🚀 Creating new event:', eventData)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.id)

    // Use the calendarId provided in the request, or fall back to first available
    let calendarId = eventData.calendarId
    let inheritedDepartment = 'email_marketing' // default
    
    if (!calendarId) {
      // Fall back to first available calendar for backwards compatibility
      console.log('📅 No calendar ID provided, finding first available calendar...')
      const { data: existingCalendars, error: calendarSelectError } = await supabase
        .from('calendars')
        .select('id, name, provider, department')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)

      if (calendarSelectError || !existingCalendars || existingCalendars.length === 0) {
        console.error('❌ No calendar found for user. User needs to set up a calendar first.')
        return NextResponse.json({ 
          error: 'No calendar found', 
          details: 'Please set up a calendar integration before creating events'
        }, { status: 400 })
      }

      const firstCalendar = existingCalendars[0]
      calendarId = firstCalendar.id
      inheritedDepartment = firstCalendar.department || 'email_marketing'
      console.log('✅ Using first calendar:', calendarId, 'Name:', firstCalendar.name, 'Provider:', firstCalendar.provider, 'Department:', inheritedDepartment)
    } else {
      // Verify the calendar belongs to the user and get department
      const { data: calendar, error: verifyError } = await supabase
        .from('calendars')
        .select('id, name, provider, department')
        .eq('id', calendarId)
        .eq('user_id', user.id)
        .single()

      if (verifyError || !calendar) {
        console.error('❌ Calendar not found or unauthorized:', calendarId)
        return NextResponse.json({ 
          error: 'Invalid calendar', 
          details: 'The selected calendar does not exist or you do not have access to it'
        }, { status: 403 })
      }
      
      inheritedDepartment = calendar.department || 'email_marketing'
      console.log('✅ Using selected calendar:', calendarId, 'Name:', calendar.name, 'Provider:', calendar.provider, 'Department:', inheritedDepartment)
    }

    console.log('📋 Event will inherit department from calendar:', inheritedDepartment)

    // Prepare event data for database insertion
    const dbEvent = {
      user_id: user.id,
      calendar_id: calendarId,
      external_event_id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID for manual events
      summary: eventData.title,
      description: eventData.description || null,
      due_date: eventData.dueDate || null,
      trigger_start: eventData.triggerStart,
      trigger_end: eventData.triggerEnd,
      raw_data: {
        created_manually: true,
        all_day: eventData.allDay || false,
        original_data: eventData
      },
      status: 'pending',
      fetched_at: new Date().toISOString(),
      tags: [],
      styles: eventData.styles || [],
      number_of_variations: eventData.numberOfVariations || 1,
      color: eventData.color || 'amber',
      department: eventData.department || inheritedDepartment // Inherit from calendar or default
    }

    console.log('💾 Inserting event into database...')
    
    // Insert the event
    const { data: insertedEvent, error: insertError } = await supabase
      .from('calendar_events')
      .insert(dbEvent)
      .select(`
        *,
        calendars!inner(
          id,
          name,
          provider
        )
      `)
      .single()

    if (insertError) {
      console.error('❌ Error inserting event:', insertError)
      return NextResponse.json({ 
        error: 'Failed to create event', 
        details: insertError.message 
      }, { status: 500 })
    }

    console.log('✅ Event created successfully:', insertedEvent.id)

    return NextResponse.json({ 
      success: true,
      event: insertedEvent,
      message: 'Event created successfully'
    })

  } catch (error) {
    console.error('❌ Unhandled error in events API:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Get query parameters
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const status = searchParams.get('status')
    const calendarId = searchParams.get('calendar_id')

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query with images join
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        calendars!inner(
          id,
          name,
          provider
        ),
        images(
          id,
          storage_url,
          thumb_url,
          title,
          created_at,
          model_name,
          generation_source
        )
      `)
      .eq('user_id', user.id)
      .order('trigger_start', { ascending: true })

    // Apply filters
    if (startDate) {
      query = query.gte('trigger_start', startDate)
    }
    if (endDate) {
      query = query.lte('trigger_start', endDate)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (calendarId) {
      query = query.eq('calendar_id', calendarId)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
    }

    return NextResponse.json({ events: events || [] })
  } catch (error) {
    console.error('Unhandled error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { eventId, eventData } = await request.json()
    
    console.log('🔄 Updating event:', eventId, eventData)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.id)

    // Prepare updated event data for database
    const updateData = {
      summary: eventData.title,
      description: eventData.description || null,
      due_date: eventData.dueDate || null,
      trigger_start: eventData.triggerStart,
      trigger_end: eventData.triggerEnd,
      color: eventData.color || 'amber',
      styles: eventData.styles || [],
      number_of_variations: eventData.numberOfVariations || 1,
      department: eventData.department, // Keep existing department unless explicitly changed
      raw_data: {
        ...eventData.originalRawData,
        created_manually: true,
        all_day: eventData.allDay || false,
        updated_at: new Date().toISOString(),
        original_data: eventData
      },
      updated_at: new Date().toISOString()
    }

    console.log('💾 Updating event in database...')
    
    // Update the event
    const { data: updatedEvent, error: updateError } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', eventId)
      .eq('user_id', user.id) // Ensure user can only update their own events
      .select(`
        *,
        calendars!inner(
          id,
          name,
          provider
        )
      `)
      .single()

    if (updateError) {
      console.error('❌ Error updating event:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update event', 
        details: updateError.message 
      }, { status: 500 })
    }

    if (!updatedEvent) {
      console.error('❌ Event not found or user not authorized')
      return NextResponse.json({ 
        error: 'Event not found or unauthorized' 
      }, { status: 404 })
    }

    console.log('✅ Event updated successfully:', updatedEvent.id)

    return NextResponse.json({ 
      success: true,
      event: updatedEvent,
      message: 'Event updated successfully'
    })

  } catch (error) {
    console.error('❌ Unhandled error in events PUT API:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
