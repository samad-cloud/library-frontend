import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// This route now stores CSV data in database for PM2 cron job processing

interface BulkProcessRequest {
  csvData: Array<Record<string, any>>
  department: string
  aspectRatio?: string
  batchSize?: number
  userId?: string
  jobId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      csvData,
      department,
      aspectRatio = '1:1',
      batchSize = 3, // PM2 processes smaller batches
      userId,
      jobId 
    } = body as BulkProcessRequest

    // Validation
    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
      return NextResponse.json(
        { error: 'CSV data is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate row count limit
    if (csvData.length > 50) {
      return NextResponse.json(
        { error: `CSV file contains ${csvData.length} rows. Maximum allowed is 50 rows. Please reduce the file size and try again.` },
        { status: 400 }
      )
    }

    // Validate that required columns exist in at least one row
    const requiredColumns = ['Product', 'Variant', 'Size', 'Region', 'Theme']
    const sampleRow = csvData[0] || {}
    const missingColumns = requiredColumns.filter(col => !(col in sampleRow))
    
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}. Expected: ${requiredColumns.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate department
    const validDepartments = ['email_marketing', 'google_sem', 'groupon']
    if (!department || !validDepartments.includes(department)) {
      return NextResponse.json(
        { error: `Invalid department: ${department}. Expected one of: ${validDepartments.join(', ')}` },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('🚀 Creating PM2 bulk CSV processing job...')
    console.log('📊 Total rows:', csvData.length)
    console.log('📝 Required columns: Product, Variant, Size, Region, Theme')
    console.log('🏢 Department:', department)
    console.log('👤 User ID:', userId)

    // Let Supabase generate UUID automatically unless jobId is provided
    const shouldGenerateId = !jobId

    // Store batch in database for PM2 cron job to process
    const supabase = await createClient()
    
    // Validate and clean CSV data - replace empty values with NULL
    const csvHeaders = Object.keys(csvData[0] || {})
    const cleanedCsvData = csvData.map((row, index) => {
      const cleanedRow: Record<string, any> = {}
      csvHeaders.forEach(header => {
        const value = row[header]
        // Replace empty, null, undefined with explicit NULL
        if (value === null || value === undefined || value === '' || 
            (typeof value === 'string' && value.trim() === '')) {
          cleanedRow[header] = null
        } else {
          cleanedRow[header] = String(value).trim()
        }
      })
      return cleanedRow
    })

    // Convert cleaned data back to CSV format for storage (optional, for backup)
    const csvContent = [
      csvHeaders.join(','),
      ...cleanedCsvData.map(row => csvHeaders.map(header => {
        const value = row[header]
        if (value === null) {
          return 'NULL'
        }
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(','))
    ].join('\n')
    
    // Generate unique filename 
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${userId}/bulk_${timestamp}.csv`
    
    // Upload CSV to storage
    const csvBlob = new Blob([csvContent], { type: 'text/csv' })
    const fileSizeBytes = csvBlob.size
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('csv-uploads')
      .upload(filename, csvBlob, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Failed to upload CSV to storage:', uploadError)
      return NextResponse.json(
        { error: 'Failed to store CSV file for processing' },
        { status: 500 }
      )
    }
    
    // Insert batch record (let Supabase generate ID automatically)
    const insertData: any = {
      user_id: userId,
      filename: filename,
      original_filename: `bulk_${Date.now()}.csv`,
      file_size_bytes: fileSizeBytes,
      total_rows: cleanedCsvData.length,
      processed_rows: 0,
      successful_rows: 0,
      failed_rows: 0,
      status: 'uploaded',
      template_id: null,
      error_message: null,
      storage_path: uploadData.path,
      storage_bucket: 'csv-uploads',
      csv_headers: csvHeaders,
      department: department
    }

    // Only include ID if explicitly provided
    if (jobId) {
      insertData.id = jobId
    }

    const { data: batchData, error: insertError } = await supabase
      .from('csv_batches')
      .insert(insertData)
      .select('id')
      .single()

    if (insertError) {
      console.error('❌ Failed to insert CSV batch:', insertError)
      return NextResponse.json(
        { error: 'Failed to store CSV batch for processing' },
        { status: 500 }
      )
    }

    const generatedJobId = batchData.id
    console.log('✅ CSV batch stored for PM2 processing:', generatedJobId)

    // Create individual row jobs for better processing and error handling
    console.log('📝 Creating individual row jobs...')
    
    const rowJobs = cleanedCsvData.map((row, index) => {
      // Generate trigger text from row data (new template format) - only include fields with values
      const triggerParts = []
      if (row.Product && row.Product.toString().trim()) triggerParts.push(`Product: ${row.Product.toString().trim()}`)
      if (row.Variant && row.Variant.toString().trim()) triggerParts.push(`Variant: ${row.Variant.toString().trim()}`)
      if (row.Size && row.Size.toString().trim()) triggerParts.push(`Size: ${row.Size.toString().trim()}`)
      if (row.Region && row.Region.toString().trim()) triggerParts.push(`Region: ${row.Region.toString().trim()}`)
      if (row.Theme && row.Theme.toString().trim()) triggerParts.push(`Theme: ${row.Theme.toString().trim()}`)
      if (row['additional comments'] && row['additional comments'].toString().trim()) {
        triggerParts.push(`Additional: ${row['additional comments'].toString().trim()}`)
      }
      const triggerText = triggerParts.join(', ')
      
      return {
        batch_id: generatedJobId,
        row_number: index + 1, // 1-based indexing
        status: 'pending',
        row_data: row,
        trigger_text: triggerText,
        retry_count: 0
      }
    })

    // Insert row jobs in batches to avoid overwhelming the database
    const insertBatchSize = 100
    let insertedRowJobs = 0
    
    for (let i = 0; i < rowJobs.length; i += insertBatchSize) {
      const batch = rowJobs.slice(i, i + insertBatchSize)
      
      const { data: batchInsertData, error: batchInsertError } = await supabase
        .from('csv_row_jobs')
        .insert(batch)
      
      if (batchInsertError) {
        console.error('❌ Failed to insert row jobs batch:', batchInsertError)
        // Don't fail the entire operation, just log the error
      } else {
        insertedRowJobs += batch.length
        console.log(`📋 Inserted ${batch.length} row jobs (${insertedRowJobs}/${rowJobs.length})`)
      }
    }

    console.log(`✅ Created ${insertedRowJobs} row jobs out of ${rowJobs.length} total rows`)

    // Update batch status to 'queued' now that row jobs are created
    await supabase
      .from('csv_batches')
      .update({ status: 'queued' })
      .eq('id', generatedJobId)

    // Return immediate response with job information
    return NextResponse.json({
      success: true,
      message: 'Bulk processing job created successfully with individual row jobs for better error handling',
      jobId: generatedJobId,
      estimatedTimeMinutes: Math.ceil(cleanedCsvData.length * 0.75), // Rough estimate: 45 seconds per row
      status: 'queued',
      metadata: {
        totalRows: cleanedCsvData.length,
        rowJobsCreated: insertedRowJobs,
        aspectRatio,
        batchSize,
        submittedAt: new Date().toISOString(),
        processingMethod: 'PM2 Row-based Processing',
        emptyValuesHandled: true
      }
    })

  } catch (error) {
    console.error('❌ Failed to create bulk CSV processing job:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start bulk processing',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    )
  }
}
