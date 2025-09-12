import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { getAccountByPageId } from '@/lib/instagram-accounts'

export async function GET(
  request: NextRequest,
  { params }: { params: { pageId: string } }
) {
  try {
    const { pageId } = params
    
    const acc = getAccountByPageId(pageId)
    if (!acc) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }
    
    if (!acc.ig_user_id) {
      return NextResponse.json(
        { success: false, error: 'ig_user_id missing' },
        { status: 400 }
      )
    }

    const response = await axios.get(`https://graph.facebook.com/v22.0/${acc.ig_user_id}`, {
      params: { 
        fields: 'id,username', 
        access_token: acc.access_token 
      }
    })

    return NextResponse.json({ 
      success: true, 
      ig_account: response.data 
    })
  } catch (error: any) {
    console.error('❌ Instagram API test failed:', error.response?.data || error.message)
    return NextResponse.json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    }, { status: 500 })
  }
}
