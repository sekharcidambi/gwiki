import { NextRequest, NextResponse } from 'next/server'

const ADOCS_API_BASE = process.env.ADOCS_API_BASE || 'http://127.0.0.1:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const docsType = searchParams.get('type') || 'docs' // 'docs' or 'wiki'

    const response = await fetch(`${ADOCS_API_BASE}/api/repositories?docs_type=${encodeURIComponent(docsType)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Failed to get repositories')
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error getting repositories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get repositories' },
      { status: 500 }
    )
  }
}