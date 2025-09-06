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
        if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
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
    const prompt = `You are an expert software architect and technical analyst creating comprehensive deep dive documentation similar to DeepWiki's detailed codebase analysis. You are analyzing a GitHub repository called "${repoName}".

Please analyze the following content titled "${title}" and create a DeepWiki-style comprehensive technical deep dive:

${content}

CRITICAL: You must respond with ONLY a valid JSON object. Do not include any other text, explanations, or formatting outside the JSON.

Required JSON format (copy this exactly and fill in the values):

{
  "summary": "A comprehensive technical summary covering the project's purpose, architecture, and key technologies in 3-4 sentences",
  "enhancedContent": "# ${title} - Deep Technical Analysis\\n\\n## Executive Summary\\n[High-level overview of the project, its purpose, and key architectural decisions]\\n\\n## System Architecture\\n[Detailed system architecture including:\\n- Component relationships and data flow\\n- Technology stack and framework choices\\n- Design patterns and architectural principles\\n- System boundaries and interfaces]\\n\\n## Core Implementation\\n[Deep dive into the core implementation including:\\n- Key algorithms and data structures\\n- Critical code paths and logic\\n- Performance-critical components\\n- Error handling and edge cases]\\n\\n## Data Flow & Processing\\n[Analysis of data processing including:\\n- Data ingestion and transformation\\n- Storage strategies and persistence\\n- Caching mechanisms and optimization\\n- Data validation and integrity]\\n\\n## Performance Analysis\\n[Comprehensive performance analysis including:\\n- Bottlenecks and optimization opportunities\\n- Resource utilization patterns\\n- Scalability considerations\\n- Performance monitoring and metrics]\\n\\n## Security & Reliability\\n[Security and reliability analysis including:\\n- Security vulnerabilities and mitigations\\n- Authentication and authorization\\n- Data protection and privacy\\n- Fault tolerance and disaster recovery]\\n\\n## Development & Deployment\\n[Development and deployment analysis including:\\n- Build and deployment pipeline\\n- Testing strategies and coverage\\n- Environment management\\n- CI/CD practices]\\n\\n## Integration & Ecosystem\\n[Integration and ecosystem analysis including:\\n- External dependencies and APIs\\n- Third-party integrations\\n- Ecosystem relationships\\n- API design and versioning]\\n\\n## Code Quality & Technical Debt\\n[Code quality and technical debt analysis including:\\n- Code organization and structure\\n- Documentation quality\\n- Technical debt assessment\\n- Maintainability factors]\\n\\n## Future Roadmap\\n[Future considerations including:\\n- Technical roadmap and evolution\\n- Scalability challenges\\n- Potential improvements\\n- Technology migration strategies]\\n\\n## Technical Insights\\n[Key technical insights including:\\n- Innovative patterns and approaches\\n- Lessons learned and best practices\\n- Technical challenges overcome\\n- Architectural decisions rationale]",
  "keyPoints": ["Architectural insight 1", "Technical pattern 2", "Performance consideration 3", "Security aspect 4", "Scalability factor 5"],
  "suggestedImprovements": ["Architecture improvement 1", "Performance optimization 2", "Security enhancement 3", "Scalability upgrade 4", "Development workflow improvement 5"]
}

Rules:
1. Start your response with { and end with }
2. No text before or after the JSON
3. Use double quotes for all strings
4. Escape any quotes within strings with backslash
5. The summary should be 3-4 sentences covering technical depth
6. Include 5 key technical insights as an array of strings
7. Include 5 architectural/technical improvements as an array of strings
8. The enhancedContent should follow DeepWiki's comprehensive deep dive format with detailed technical sections
9. Focus on technical depth, architectural patterns, implementation details, and professional analysis
10. Include specific code patterns, design decisions, and technical insights
11. Write in a professional, analytical tone suitable for technical documentation
12. Provide actionable insights and technical recommendations

Create deep dive documentation that matches DeepWiki's level of technical detail, comprehensive analysis, and professional presentation.`

    const response = await anthropic.messages.create({
              model: 'claude-sonnet-4-20250514',
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
    
    const prompt = `You are analyzing a GitHub repository to create a comprehensive technical deep dive summary similar to DeepWiki's analysis style.

Repository Information:
- Name: ${repoData.name}
- Description: ${repoData.description || 'No description provided'}
- Language: ${repoData.language || 'Not specified'}
- Stars: ${repoData.stars}
- Topics: ${repoData.topics?.join(', ') || 'None'}
- Documentation Pages: ${pageTitles}

Please provide a comprehensive technical analysis summary (4-5 paragraphs) that covers:
1. **Executive Overview**: High-level project purpose, key architectural decisions, and technology choices
2. **System Architecture**: Component relationships, data flow patterns, and architectural principles
3. **Technical Implementation**: Key algorithms, design patterns, and implementation strategies
4. **Performance & Scalability**: Architecture decisions impacting performance, scalability considerations, and optimization opportunities
5. **Development & Quality**: Code quality indicators, testing strategies, development practices, and technical debt assessment
6. **Technical Insights**: Unique architectural patterns, innovative approaches, technical challenges, and lessons learned

Write in a professional, analytical tone suitable for software architects, senior developers, and technical decision-makers. Focus on technical depth, architectural insights, and actionable recommendations similar to DeepWiki's comprehensive analysis style.`

    const response = await anthropic.messages.create({
              model: 'claude-sonnet-4-20250514',
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