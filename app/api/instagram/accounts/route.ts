import { NextRequest, NextResponse } from 'next/server'

// Import from lib directory
import { getAccountsPublic } from '@/lib/instagram-accounts'

interface InstagramAccount {
  page_id: string
  ig_user_id: string | null
  name: string
  username: string
  is_default: boolean
}

export async function GET() {
  try {
    const accounts: InstagramAccount[] = getAccountsPublic() // no tokens exposed
    const defaultAccount = accounts.find((a: InstagramAccount) => a.is_default) || accounts[0] || null
    
    return NextResponse.json({
      success: true,
      accounts,
      default_account: defaultAccount
    })
  } catch (error: any) {
    console.error('❌ Instagram accounts fetch failed:', error?.message || error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Instagram accounts' },
      { status: 500 }
    )
  }
}
