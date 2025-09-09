import { NextRequest, NextResponse } from 'next/server'

const ADOCS_API_BASE = process.env.ADOCS_API_BASE || 'http://127.0.0.1:8000'

export async function POST(request: NextRequest) {
  try {
    const { repoUrl } = await request.json()
    
    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 })
    }

    // Validate GitHub URL format
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!urlMatch) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
    }

    const response = await fetch(`${ADOCS_API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repo_url: repoUrl }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.detail || 'Failed to analyze repository')
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error analyzing repository:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to analyze repository. Please check the repository URL and try again.' },
      { status: 500 }
    )
  }
}