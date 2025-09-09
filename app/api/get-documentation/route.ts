import { NextRequest, NextResponse } from 'next/server'

const ADOCS_API_BASE = process.env.ADOCS_API_BASE || 'http://127.0.0.1:8000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const repo = searchParams.get('repo')
    const section = searchParams.get('section')
    const docsType = searchParams.get('type') || 'docs' // 'docs' or 'wiki'

    if (!repo) {
      return NextResponse.json({ error: 'Repository parameter is required' }, { status: 400 })
    }

    // Build the URL for the FastAPI service
    const url = new URL(`${ADOCS_API_BASE}/api/documentation`)
    url.searchParams.set('repo', repo)
    url.searchParams.set('docs_type', docsType)
    if (section) {
      url.searchParams.set('section', section)
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Failed to get documentation')
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching documentation:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documentation' },
      { status: 500 }
    )
  }
}