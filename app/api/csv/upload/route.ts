import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_ROWS = 50

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const templateId = formData.get('template_id') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type - accept CSV and Excel files
    const isCSV = file.type.includes('csv') || file.name.endsWith('.csv')
    const isExcel = file.type.includes('spreadsheet') || 
                   file.type.includes('excel') ||
                   file.name.endsWith('.xlsx') || 
                   file.name.endsWith('.xls')
    
    if (!isCSV && !isExcel) {
      return NextResponse.json({ error: 'File must be a CSV or Excel file (.csv, .xlsx, .xls)' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 })
    }

    // Read and parse file (CSV or Excel)
    let csvData: any[]
    
    try {
      if (isExcel) {
        // Parse Excel file
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) {
          return NextResponse.json({ error: 'Excel file has no worksheets' }, { status: 400 })
        }
        
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Convert to JSON with headers
        csvData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // Get raw array first
          blankrows: false,
          defval: ''
        })
        
        // Convert array format to object format with headers
        if (csvData.length === 0) {
          return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
        }
        
        const headers = csvData[0] as string[]
        const dataRows = csvData.slice(1)
        
        csvData = dataRows.map(row => {
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = (row as any[])[index] || ''
          })
          return obj
        }).filter(row => Object.values(row).some(val => val !== '')) // Remove empty rows
        
      } else {
        // Parse CSV file
        const csvText = await file.text()
        csvData = parse(csvText, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        })
      }
    } catch (parseError) {
      console.error('File parsing error:', parseError)
      return NextResponse.json({ 
        error: isExcel ? 'Invalid Excel format' : 'Invalid CSV format' 
      }, { status: 400 })
    }

    // Validate row count
    if (csvData.length === 0) {
      return NextResponse.json({ error: `${isExcel ? 'Excel' : 'CSV'} file is empty` }, { status: 400 })
    }

    if (csvData.length > MAX_ROWS) {
      return NextResponse.json({ 
        error: `Too many rows. Maximum is ${MAX_ROWS} rows` 
      }, { status: 400 })
    }

    // Get file headers
    const headers = Object.keys(csvData[0] || {})
    if (headers.length < 2) {
      return NextResponse.json({ error: `${isExcel ? 'Excel' : 'CSV'} file must have at least 2 columns` }, { status: 400 })
    }

    // Template validation is now mandatory - find matching template or require selection
    let matchedTemplate: any = null
    
    if (templateId) {
      // User explicitly selected a template - validate against it
      const { data: template, error: templateError } = await supabase
        .from('csv_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError || !template) {
        return NextResponse.json({ error: 'Invalid template selected' }, { status: 400 })
      }

      // Check required columns
      const missingColumns = template.required_columns.filter((col: string) => 
        !headers.some((h: string) => h.toLowerCase().includes(col.toLowerCase()))
      )

      if (missingColumns.length > 0) {
        return NextResponse.json({ 
          error: `File does not match selected template. Missing required columns: ${missingColumns.join(', ')}` 
        }, { status: 400 })
      }

      matchedTemplate = template
    } else {
      // No template selected - try to find a matching template automatically
      const { data: templates, error: templatesError } = await supabase
        .from('csv_templates')
        .select('*')
        .order('is_default', { ascending: false }) // Default templates first

      if (templatesError) {
        return NextResponse.json({ error: 'Unable to validate file format' }, { status: 500 })
      }

      if (!templates || templates.length === 0) {
        return NextResponse.json({ 
          error: 'No templates available. Please contact administrator to set up templates.' 
        }, { status: 400 })
      }

      // Try to find a matching template
      for (const template of templates) {
        const hasAllRequired = template.required_columns.every((col: string) => 
          headers.some((h: string) => h.toLowerCase().includes(col.toLowerCase()))
        )
        if (hasAllRequired) {
          matchedTemplate = template
          break
        }
      }

      if (!matchedTemplate) {
        // List available templates and their requirements
        const templateOptions = templates.map(t => 
          `"${t.name}" (requires: ${t.required_columns.join(', ')})`
        ).join('; ')
        
        return NextResponse.json({ 
          error: `File format does not match any available template. Please select a template or update your file. Available templates: ${templateOptions}`,
          availableTemplates: templates.map(t => ({
            id: t.id,
            name: t.name,
            required_columns: t.required_columns,
            description: t.description
          }))
        }, { status: 400 })
      }
    }

    // Generate unique filename with user folder structure
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${user.id}/${timestamp}_${file.name}`

    // Upload file to Supabase Storage [[memory:4926245]]
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('csv-uploads')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to store file' }, { status: 500 })
    }

    // Create CSV batch record
    const { data: batch, error: batchError } = await supabase
      .from('csv_batches')
      .insert({
        user_id: user.id,
        filename: filename,
        original_filename: file.name,
        file_size_bytes: file.size,
        total_rows: csvData.length,
        storage_path: uploadData.path,
        storage_bucket: 'csv-uploads',
        csv_headers: headers,
        template_id: matchedTemplate.id,
        status: 'uploaded',
        metadata: {
          upload_timestamp: new Date().toISOString(),
          file_type: file.type,
          detected_encoding: 'utf-8'
        }
      })
      .select()
      .single()

    if (batchError) {
      console.error('Batch creation error:', batchError)
      // Clean up uploaded file
      await supabase.storage.from('csv-uploads').remove([filename])
      return NextResponse.json({ error: 'Failed to create batch record' }, { status: 500 })
    }

    // Create row job records
    const rowJobs = csvData.map((row, index) => ({
      batch_id: batch.id,
      row_number: index + 1,
      row_data: row,
      status: 'pending' as const
    }))

    // Insert row jobs in chunks to avoid query limits
    const CHUNK_SIZE = 1000
    for (let i = 0; i < rowJobs.length; i += CHUNK_SIZE) {
      const chunk = rowJobs.slice(i, i + CHUNK_SIZE)
      const { error: jobsError } = await supabase
        .from('csv_row_jobs')
        .insert(chunk)

      if (jobsError) {
        console.error('Row jobs creation error:', jobsError)
        // Clean up batch and file
        await supabase.from('csv_batches').delete().eq('id', batch.id)
        await supabase.storage.from('csv-uploads').remove([filename])
        return NextResponse.json({ error: 'Failed to create processing jobs' }, { status: 500 })
      }
    }

    // Update batch status to queued to trigger processing
    const { error: updateError } = await supabase
      .from('csv_batches')
      .update({ 
        status: 'queued',
        queued_at: new Date().toISOString()
      })
      .eq('id', batch.id)

    if (updateError) {
      console.error('Batch update error:', updateError)
    }

    // Return success response
    return NextResponse.json({
      success: true,
      batch: {
        id: batch.id,
        filename: batch.original_filename,
        total_rows: batch.total_rows,
        status: 'queued',
        template_used: {
          id: matchedTemplate.id,
          name: matchedTemplate.name,
          description: matchedTemplate.description
        }
      },
      message: `File uploaded successfully using "${matchedTemplate.name}" template. Processing will begin shortly.`
    })

  } catch (error) {
    console.error('CSV upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
