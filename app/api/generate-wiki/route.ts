import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from 'octokit'
import Anthropic from '@anthropic-ai/sdk'

// Initialize Octokit (GitHub API client)
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

// Initialize Claude AI
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { repoUrl } = await request.json()

    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 })
    }

    // Extract owner and repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 })
    }

    const [, owner, repo] = match

    // Fetch repository information
    const repoResponse = await octokit.rest.repos.get({
      owner,
      repo,
    })

    const repository = repoResponse.data

    // Fetch README
    let readmeContent = ''
    try {
      const readmeResponse = await octokit.rest.repos.getReadme({
        owner,
        repo,
      })
      readmeContent = Buffer.from(readmeResponse.data.content, 'base64').toString()
    } catch (error) {
      console.log('No README found')
    }

    // Fetch repository contents (reverted to original logic)
    const contentsResponse = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '',
    })
    const contents = Array.isArray(contentsResponse.data) ? contentsResponse.data : [contentsResponse.data]
    const docFiles = await findDocumentationFiles(owner, repo, contents)

    const pages = []
    const structure = []

    // Add README as first page
    if (readmeContent) {
      pages.push({
        title: 'README',
        content: readmeContent,
        path: 'README.md',
        type: 'readme' as const,
      })
      structure.push({
        title: 'README',
        path: 'README.md',
      })
    }

    // Add documentation files
    for (const file of docFiles) {
      try {
        const fileResponse = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: file.path,
        })
        if (!Array.isArray(fileResponse.data) && fileResponse.data.type === 'file') {
          const content = Buffer.from(fileResponse.data.content, 'base64').toString()
          const title = getTitleFromPath(file.path)
          pages.push({
            title,
            content,
            path: file.path,
            type: getFileType(file.path),
          })
          structure.push({
            title,
            path: file.path,
          })
        }
      } catch (error) {
        console.log(`Error fetching file ${file.path}:`, error)
      }
    }

    // Generate repository summary using Claude
    let repositorySummary = ''
    try {
      repositorySummary = await generateRepositorySummary(
        {
          name: repository.name,
          description: repository.description || '',
          language: repository.language || '',
          stars: repository.stargazers_count,
          topics: repository.topics || [],
        },
        pages
      )
    } catch (error) {
      console.log('Failed to generate repository summary:', error)
    }

    // Enhance documentation with Claude (with rate limiting)
    const enhancedPages = []
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      try {
        // Add delay between requests to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
        }
        
        const enhanced = await generateEnhancedContent(
          page.content,
          page.title,
          repository.name
        )
        enhancedPages.push({
          ...page,
          originalContent: page.content,
          enhancedContent: enhanced.enhancedContent,
          summary: enhanced.summary,
          keyPoints: enhanced.keyPoints,
          suggestedImprovements: enhanced.suggestedImprovements,
        })
      } catch (error) {
        console.log(`Failed to enhance page ${page.title}:`, error)
        
        // Check if it's a rate limit error
        if (error.status === 429) {
          console.log('Rate limit hit, waiting 60 seconds before continuing...')
          await new Promise(resolve => setTimeout(resolve, 60000)) // Wait 60 seconds
          // Try one more time after waiting
          try {
            const enhanced = await generateEnhancedContent(
              page.content,
              page.title,
              repository.name
            )
            enhancedPages.push({
              ...page,
              originalContent: page.content,
              enhancedContent: enhanced.enhancedContent,
              summary: enhanced.summary,
              keyPoints: enhanced.keyPoints,
              suggestedImprovements: enhanced.suggestedImprovements,
            })
          } catch (retryError) {
            console.log(`Retry failed for page ${page.title}:`, retryError)
            enhancedPages.push({
              ...page,
              originalContent: page.content,
              enhancedContent: page.content,
              summary: 'Unable to generate summary due to rate limiting.',
              keyPoints: [],
              suggestedImprovements: [],
            })
          }
        } else {
          enhancedPages.push({
            ...page,
            originalContent: page.content,
            enhancedContent: page.content,
            summary: 'Unable to generate summary.',
            keyPoints: [],
            suggestedImprovements: [],
          })
        }
      }
    }

    const wikiData = {
      repository: {
        name: repository.name,
        description: repository.description || '',
        owner: repository.owner.login,
        stars: repository.stargazers_count,
        language: repository.language || '',
        topics: repository.topics || [],
        createdAt: repository.created_at,
        updatedAt: repository.updated_at,
        summary: repositorySummary,
      },
      pages: enhancedPages,
      structure,
    }

    return NextResponse.json(wikiData)
  } catch (error) {
    console.error('Error generating wiki:', error)
    return NextResponse.json(
      { error: 'Failed to generate wiki. Please check the repository URL and try again.' },
      { status: 500 }
    )
  }
}

async function generateEnhancedContent(
  content: string,
  title: string,
  repoName: string
): Promise<{
  summary: string
  enhancedContent: string
  keyPoints: string[]
  suggestedImprovements: string[]
}> {
  try {
    const prompt = `You are an expert technical writer and documentation specialist. You are analyzing documentation from a GitHub repository called "${repoName}".

Please enhance the following documentation content titled "${title}":

${content}

CRITICAL: You must respond with ONLY a valid JSON object. Do not include any other text, explanations, or formatting outside the JSON.

Required JSON format (copy this exactly and fill in the values):

{
  "summary": "A concise 2-3 sentence summary of the content",
  "enhancedContent": "The enhanced markdown content with better structure and clarity",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "suggestedImprovements": ["Improvement 1", "Improvement 2", "Improvement 3"]
}

Rules:
1. Start your response with { and end with }
2. No text before or after the JSON
3. Use double quotes for all strings
4. Escape any quotes within strings with backslash
5. The summary should be 2-3 sentences maximum
6. Include 3-5 key points as an array of strings
7. Include 3-5 suggested improvements as an array of strings
8. The enhancedContent should be the improved version of the original content

Focus on making the documentation more accessible, well-structured, and comprehensive while maintaining the original intent and technical accuracy.`

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseContent = response.content[0]
    if (responseContent.type === 'text') {
      // Log the raw response for debugging
      console.log('Raw Claude response:', responseContent.text)
      
      try {
        // Try to extract JSON from the response
        const jsonMatch = responseContent.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          console.log('Extracted JSON string:', jsonMatch[0])
          const parsed = JSON.parse(jsonMatch[0])
          console.log('Parsed JSON object:', parsed)
          
          // Validate the parsed object has all required fields
          if (parsed.summary && parsed.enhancedContent && Array.isArray(parsed.keyPoints) && Array.isArray(parsed.suggestedImprovements)) {
            return {
              summary: parsed.summary,
              enhancedContent: parsed.enhancedContent,
              keyPoints: parsed.keyPoints,
              suggestedImprovements: parsed.suggestedImprovements,
            }
          } else {
            console.log('JSON missing required fields:', {
              hasSummary: !!parsed.summary,
              hasEnhancedContent: !!parsed.enhancedContent,
              hasKeyPoints: Array.isArray(parsed.keyPoints),
              hasSuggestedImprovements: Array.isArray(parsed.suggestedImprovements)
            })
          }
        } else {
          console.log('No JSON object found in response')
        }
      } catch (error) {
        console.log('Failed to parse JSON response, using fallback. Error:', error)
      }

      // Fallback: extract information from text response
      return {
        summary: extractSummary(responseContent.text),
        enhancedContent: content, // Keep original if parsing fails
        keyPoints: extractKeyPoints(responseContent.text),
        suggestedImprovements: extractImprovements(responseContent.text),
      }
    }

    throw new Error('Invalid response format from Claude')
  } catch (error) {
    console.error('Error enhancing documentation:', error)
    // Return fallback response
    return {
      summary: 'Unable to generate summary at this time.',
      enhancedContent: content,
      keyPoints: [],
      suggestedImprovements: [],
    }
  }
}

async function generateRepositorySummary(
  repoData: any,
  pages: any[]
): Promise<string> {
  try {
    const pageTitles = pages.map(p => p.title).join(', ')
    
    const prompt = `You are analyzing a GitHub repository to create a comprehensive summary.

Repository Information:
- Name: ${repoData.name}
- Description: ${repoData.description || 'No description provided'}
- Language: ${repoData.language || 'Not specified'}
- Stars: ${repoData.stars}
- Topics: ${repoData.topics?.join(', ') || 'None'}
- Documentation Pages: ${pageTitles}

Please provide a concise but comprehensive summary of this repository (2-3 paragraphs) that would help someone understand:
1. What this project is about
2. Its main features and purpose
3. The quality and comprehensiveness of its documentation
4. Who might find it useful

Write in a clear, professional tone suitable for a technical audience.`

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseContent = response.content[0]
    if (responseContent.type === 'text') {
      return responseContent.text
    }

    return 'Unable to generate repository summary at this time.'
  } catch (error) {
    console.error('Error generating repository summary:', error)
    return 'Unable to generate repository summary at this time.'
  }
}

function extractSummary(text: string): string {
  const summaryMatch = text.match(/summary[:\s]+([^.\n]+[.\n])/i)
  return summaryMatch ? summaryMatch[1].trim() : 'Summary not available.'
}

function extractKeyPoints(text: string): string[] {
  const pointsMatch = text.match(/key points?[:\s]+([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i)
  if (pointsMatch) {
    return pointsMatch[1]
      .split('\n')
      .map(point => point.replace(/^[-*•]\s*/, '').trim())
      .filter(point => point.length > 0)
  }
  return []
}

function extractImprovements(text: string): string[] {
  const improvementsMatch = text.match(/suggested improvements?[:\s]+([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i)
  if (improvementsMatch) {
    return improvementsMatch[1]
      .split('\n')
      .map(improvement => improvement.replace(/^[-*•]\s*/, '').trim())
      .filter(improvement => improvement.length > 0)
  }
  return []
}

async function findDocumentationFiles(owner: string, repo: string, contents: any[]): Promise<any[]> {
  const docFiles = []
  const docPatterns = [
    /^readme\.md$/i,
    /^docs?\//i,
    /\.md$/,
    /^documentation\//i,
    /^guide\//i,
    /^tutorial\//i,
    /^examples?\//i,
  ]

  for (const item of contents) {
    if (item.type === 'file') {
      if (docPatterns.some(pattern => pattern.test(item.path))) {
        docFiles.push(item)
      }
    } else if (item.type === 'dir') {
      // Recursively search directories
      try {
        const subContentsResponse = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: item.path,
        })
        
        if (Array.isArray(subContentsResponse.data)) {
          const subFiles = await findDocumentationFiles(owner, repo, subContentsResponse.data)
          docFiles.push(...subFiles)
        }
      } catch (error) {
        console.log(`Error accessing directory ${item.path}:`, error)
      }
    }
  }

  return docFiles
}

function getTitleFromPath(path: string): string {
  const filename = path.split('/').pop() || ''
  const nameWithoutExt = filename.replace(/\.(md|txt|rst)$/i, '')
  
  // Convert kebab-case or snake_case to Title Case
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
}

function getFileType(path: string): 'readme' | 'docs' | 'code' | 'other' {
  const lowerPath = path.toLowerCase()
  
  if (lowerPath.includes('readme')) return 'readme'
  if (lowerPath.includes('docs') || lowerPath.includes('documentation')) return 'docs'
  if (lowerPath.includes('example') || lowerPath.includes('demo')) return 'code'
  
  return 'other'
} 