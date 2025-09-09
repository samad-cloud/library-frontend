import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await props.params
    const { id: templateId } = params

    // Get template data
    const { data: template, error: templateError } = await supabase
      .from('csv_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Generate CSV content from template
    const csvContent = generateCsvFromTemplate(template)

    // Increment download count
    await supabase.rpc('increment_template_download', { p_template_id: templateId })

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${template.name.replace(/\s+/g, '_')}_template.csv"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Template download error:', error)
    return NextResponse.json({ 
      error: 'Failed to download template' 
    }, { status: 500 })
  }
}

function generateCsvFromTemplate(template: any): string {
  const { required_columns, optional_columns, sample_data, column_descriptions } = template
  
  // Combine required and optional columns
  const allColumns = [...required_columns, ...optional_columns]
  
  // Create header row
  const headers = allColumns.join(',')
  
  // Create description row (commented)
  const descriptions = allColumns.map(col => {
    const desc = column_descriptions?.[col] || `Enter ${col} value`
    return `"${desc}"`
  }).join(',')
  
  // Create sample data rows
  let sampleRows = ''
  if (sample_data && Array.isArray(sample_data)) {
    sampleRows = sample_data.map((row: any) => {
      return allColumns.map(col => {
        const value = row[col] || ''
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    }).join('\n')
  }
  
  // If no sample data, create empty rows for user to fill
  if (!sampleRows) {
    sampleRows = allColumns.map(() => '').join(',')
  }
  
  // Combine all parts
  const csvLines = [
    '# Column descriptions:',
    `# ${descriptions}`,
    '#',
    headers,
    sampleRows
  ]
  
  return csvLines.join('\n')
}
