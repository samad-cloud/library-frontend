import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'

// No file size limit for templates since we only extract headers

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

    // No file size validation needed since we only extract headers

    // Read and parse file to extract structure
    let csvData: any[]
    let headers: string[]
    
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
        const rawData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // Get raw array first
          blankrows: false,
          defval: ''
        })
        
        if (rawData.length === 0) {
          return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
        }
        
        headers = (rawData[0] as string[]).filter(header => header && header.trim())
        
        // Create sample data structure
        csvData = rawData.slice(1, 3).map(row => {
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = (row as any[])[index] || ''
          })
          return obj
        }).filter(row => Object.values(row).some(val => val !== ''))
        
      } else {
        // Parse CSV file
        const csvText = await file.text()
        csvData = parse(csvText, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        })
        
        headers = Object.keys(csvData[0] || {})
      }
    } catch (parseError) {
      console.error('File parsing error:', parseError)
      return NextResponse.json({ 
        error: isExcel ? 'Invalid Excel format' : 'Invalid CSV format' 
      }, { status: 400 })
    }

    // Validate headers
    if (headers.length === 0) {
      return NextResponse.json({ error: 'Template file is empty or has no valid headers' }, { status: 400 })
    }
    
    if (headers.length < 2) {
      return NextResponse.json({ error: 'Template must have at least 2 columns' }, { status: 400 })
    }

    // Create a clean template CSV with only headers (no data rows)
    const cleanTemplateContent = headers.join(',')

    // Generate sample data for database storage (examples for UI)
    const sampleData = [
      // Create one example row with placeholder values
      headers.reduce((obj, header) => {
        const lowerHeader = header.toLowerCase()
        if (lowerHeader.includes('name') || lowerHeader.includes('title')) {
          obj[header] = 'Example Product Name'
        } else if (lowerHeader.includes('description')) {
          obj[header] = 'Product description goes here'
        } else if (lowerHeader.includes('price') || lowerHeader.includes('cost')) {
          obj[header] = '19.99'
        } else if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
          obj[header] = 'Category Name'
        } else if (lowerHeader.includes('size')) {
          obj[header] = 'Medium'
        } else if (lowerHeader.includes('color')) {
          obj[header] = 'Blue'
        } else if (lowerHeader.includes('country') || lowerHeader.includes('region')) {
          obj[header] = 'US'
        } else {
          obj[header] = `Example ${header}`
        }
        return obj
      }, {} as Record<string, string>)
    ]

    // Generate template name from filename
    const templateName = file.name.replace(/\.csv$/i, '').replace(/[_-]/g, ' ')
    const capitalizedName = templateName.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') + ' Template'

    // Generate unique filename for storage with user folder structure
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${user.id}/template_${timestamp}_${file.name}`

    // Create a clean template file (headers only) and upload to Supabase Storage
    const cleanTemplateBlob = new Blob([cleanTemplateContent], { type: 'text/csv' })
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('csv-templates')
      .upload(filename, cleanTemplateBlob, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to store template file' }, { status: 500 })
    }

    // Create column descriptions (basic auto-generation)
    const columnDescriptions: Record<string, string> = {}
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase()
      if (lowerHeader.includes('name') || lowerHeader.includes('title')) {
        columnDescriptions[header] = `Enter the ${header.toLowerCase()}`
      } else if (lowerHeader.includes('description')) {
        columnDescriptions[header] = `Detailed description or information`
      } else if (lowerHeader.includes('type') || lowerHeader.includes('category')) {
        columnDescriptions[header] = `Category or type classification`
      } else if (lowerHeader.includes('price') || lowerHeader.includes('cost')) {
        columnDescriptions[header] = `Price or cost value`
      } else if (lowerHeader.includes('size') || lowerHeader.includes('dimension')) {
        columnDescriptions[header] = `Size or dimensional specification`
      } else {
        columnDescriptions[header] = `Enter ${header.toLowerCase()} value`
      }
    })

    // Create template record
    const { data: template, error: templateError } = await supabase
      .from('csv_templates')
      .insert({
        name: capitalizedName,
        description: `Custom template uploaded by user`,
        template_type: 'custom',
        required_columns: headers.slice(0, Math.min(headers.length, 4)), // First few columns as required
        optional_columns: headers.slice(4), // Rest as optional
        column_descriptions: columnDescriptions,
        sample_data: sampleData,
        storage_path: uploadData.path,
        storage_bucket: 'csv-templates',
        file_size_bytes: cleanTemplateBlob.size,
        version: 1,
        is_active: true,
        is_default: false
      })
      .select()
      .single()

    if (templateError) {
      console.error('Template creation error:', templateError)
      // Clean up uploaded file
      await supabase.storage.from('csv-templates').remove([filename])
      return NextResponse.json({ error: 'Failed to create template record' }, { status: 500 })
    }

    // Return success response
    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        required_columns: template.required_columns,
        optional_columns: template.optional_columns
      },
      message: 'Template uploaded successfully'
    })

  } catch (error) {
    console.error('Template upload error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
