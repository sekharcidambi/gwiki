import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'
import Anthropic from '@anthropic-ai/sdk'
import { exec as execCallback } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(execCallback)

// Initialize GitHub API client
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

    // Parse GitHub URL
    const urlMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!urlMatch) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
    }

    const [, owner, repo] = urlMatch

    // Step 1: Fetch repository data from GitHub API
    const repository = await octokit.rest.repos.get({
      owner,
      repo,
    })

    // Step 2: Create temporary directory for repository analysis
    const tempDir = `/tmp/repo-analysis-${Date.now()}`
    await execAsync(`mkdir -p ${tempDir}`)
    
    const repoPath = `${tempDir}/${repo}`

    // Step 3: Analyze repository structure and content
    const repoAnalysis = await analyzeRepository(repoPath, repository)

    // Step 4: Generate documentation structure using adocs approach
    const docStructure = await generateDocumentationStructure(repoAnalysis)

    // Step 5: Fetch and enhance documentation content
    const enhancedPages = await fetchAndEnhanceDocumentation(owner, repo, docStructure, repoAnalysis)

    // Step 6: Clean up temporary directory
    try {
      await execAsync(`rm -rf ${tempDir}`)
    } catch (error) {
      console.error('Failed to clean up temp directory:', error)
    }

    // Build navigation structure and clean it to avoid circular references
    const navigation = buildNavigationStructure(docStructure, enhancedPages)
    
    // Clean the navigation structure to remove any circular references
    const cleanNavigation = JSON.parse(JSON.stringify(navigation, (key, value) => {
      // Remove any circular references
      if (key === 'parent' || key === 'root') {
        return undefined
      }
      return value
    }))

    const result = {
      repository: {
        name: repository.data.name,
        description: repository.data.description || '',
        owner: repository.data.owner.login,
        stars: repository.data.stargazers_count,
        language: repository.data.language || '',
        topics: repository.data.topics || [],
        createdAt: repository.data.created_at,
        updatedAt: repository.data.updated_at,
        // Enhanced metadata from repoMetadata analysis
        businessDomain: repoAnalysis.business_domain,
        techStack: repoAnalysis.tech_stack,
        architecture: repoAnalysis.architecture,
        setup: repoAnalysis.setup,
        metadata: repoAnalysis.metadata,
        summary: repoAnalysis.summary,
      },
      documentationStructure: docStructure,
      pages: enhancedPages,
      navigation: cleanNavigation,
      // Information about generated markdown files
      generatedFiles: {
        hasMarkdownFiles: true,
        repository: `${owner}/${repo}`,
        note: "Documentation has been saved as markdown files in the ADocS generated_docs directory"
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error analyzing repository:', error)
    return NextResponse.json(
      { error: 'Failed to analyze repository. Please check the repository URL and try again.' },
      { status: 500 }
    )
  }
}

async function analyzeRepository(repoPath: string, repository: any) {
  // This function implements the repoMetadata analysis logic
  const analysis = {
    github_repo: repository.data.html_url,
    business_domain: '',
    overview: repository.data.description || '',
    tech_stack: {
      languages: [],
      frontend: [],
      backend: [],
      databases: [],
      devops: [],
    },
    architecture: {
      pattern: '',
      description: '',
    },
    setup: {
      install: '',
      run: '',
      test: '',
    },
    metadata: {
      stars: repository.data.stargazers_count,
      forks: repository.data.forks_count,
      license: repository.data.license?.name || 'Unknown',
      status: repository.data.archived ? 'Archived' : 'Active',
    },
    summary: '',
  }

  try {
    // Read package.json, requirements.txt, etc.
    const packageJsonPath = `${repoPath}/package.json`
    const requirementsPath = `${repoPath}/requirements.txt`
    const pomXmlPath = `${repoPath}/pom.xml`
    const buildGradlePath = `${repoPath}/build.gradle`
    const dockerfilePath = `${repoPath}/Dockerfile`
    const dockerComposePath = `${repoPath}/docker-compose.yml`

    // Analyze package.json for Node.js projects
    try {
      const packageJson = await execAsync(`cat ${packageJsonPath} 2>/dev/null || echo "{}"`)
      const pkg = JSON.parse(packageJson.stdout)
      
      if (pkg.dependencies || pkg.devDependencies) {
        analysis.tech_stack.languages.push('JavaScript', 'TypeScript')
        
        // Analyze dependencies for tech stack
        const deps = { ...pkg.dependencies, ...pkg.devDependencies }
        Object.keys(deps).forEach(dep => {
          if (dep.includes('react') || dep.includes('vue') || dep.includes('angular')) {
            analysis.tech_stack.frontend.push(dep)
          }
          if (dep.includes('express') || dep.includes('fastify') || dep.includes('koa')) {
            analysis.tech_stack.backend.push(dep)
          }
          if (dep.includes('mongodb') || dep.includes('mongoose')) {
            analysis.tech_stack.databases.push('MongoDB')
          }
          if (dep.includes('mysql') || dep.includes('postgresql')) {
            analysis.tech_stack.databases.push(dep)
          }
        })
        
        // Setup commands
        if (pkg.scripts) {
          analysis.setup.install = 'npm install'
          analysis.setup.run = pkg.scripts.start || pkg.scripts.dev || 'npm start'
          analysis.setup.test = pkg.scripts.test || 'npm test'
        }
      }
    } catch (error) {
      // Package.json not found or invalid
    }

    // Analyze requirements.txt for Python projects
    try {
      const requirements = await execAsync(`cat ${requirementsPath} 2>/dev/null || echo ""`)
      if (requirements.stdout.trim()) {
        analysis.tech_stack.languages.push('Python')
        
        const lines = requirements.stdout.split('\n')
        lines.forEach(line => {
          const dep = line.split('==')[0].split('>=')[0].split('<=')[0].trim()
          if (dep.includes('django') || dep.includes('flask') || dep.includes('fastapi')) {
            analysis.tech_stack.backend.push(dep)
          }
          if (dep.includes('pandas') || dep.includes('numpy')) {
            analysis.tech_stack.databases.push('Data Analysis')
          }
        })
        
        analysis.setup.install = 'pip install -r requirements.txt'
        analysis.setup.run = 'python app.py'
        analysis.setup.test = 'python -m pytest'
      }
    } catch (error) {
      // Requirements.txt not found
    }

    // Analyze pom.xml for Java projects
    try {
      const pomXml = await execAsync(`cat ${pomXmlPath} 2>/dev/null || echo ""`)
      if (pomXml.stdout.includes('<groupId>')) {
        analysis.tech_stack.languages.push('Java')
        analysis.tech_stack.backend.push('Maven')
        
        analysis.setup.install = 'mvn clean install'
        analysis.setup.run = 'mvn spring-boot:run'
        analysis.setup.test = 'mvn test'
      }
    } catch (error) {
      // pom.xml not found
    }

    // Analyze build.gradle for Java/Kotlin projects
    try {
      const buildGradle = await execAsync(`cat ${buildGradlePath} 2>/dev/null || echo ""`)
      if (buildGradle.stdout.includes('plugins') || buildGradle.stdout.includes('dependencies')) {
        analysis.tech_stack.languages.push('Java', 'Kotlin')
        analysis.tech_stack.backend.push('Gradle')
        
        analysis.setup.install = './gradlew build'
        analysis.setup.run = './gradlew bootRun'
        analysis.setup.test = './gradlew test'
      }
    } catch (error) {
      // build.gradle not found
    }

    // Analyze Dockerfile
    try {
      const dockerfile = await execAsync(`cat ${dockerfilePath} 2>/dev/null || echo ""`)
      if (dockerfile.stdout.includes('FROM')) {
        analysis.tech_stack.devops.push('Docker')
        analysis.setup.install = 'docker build -t app .'
        analysis.setup.run = 'docker run -p 3000:3000 app'
      }
    } catch (error) {
      // Dockerfile not found
    }

    // Analyze docker-compose.yml
    try {
      const dockerCompose = await execAsync(`cat ${dockerComposePath} 2>/dev/null || echo ""`)
      if (dockerCompose.stdout.includes('version:') || dockerCompose.stdout.includes('services:')) {
        analysis.tech_stack.devops.push('Docker Compose')
        analysis.setup.run = 'docker-compose up'
      }
    } catch (error) {
      // docker-compose.yml not found
    }

    // Determine business domain based on repository name and description
    const repoName = repository.data.name.toLowerCase()
    const description = (repository.data.description || '').toLowerCase()
    
    if (repoName.includes('web') || repoName.includes('frontend') || repoName.includes('ui')) {
      analysis.business_domain = 'Web Development'
    } else if (repoName.includes('api') || repoName.includes('backend') || repoName.includes('server')) {
      analysis.business_domain = 'Backend Development'
    } else if (repoName.includes('mobile') || repoName.includes('ios') || repoName.includes('android')) {
      analysis.business_domain = 'Mobile Development'
    } else if (repoName.includes('data') || repoName.includes('ml') || repoName.includes('ai')) {
      analysis.business_domain = 'Data Science'
    } else if (repoName.includes('devops') || repoName.includes('infra') || repoName.includes('deploy')) {
      analysis.business_domain = 'DevOps'
    } else {
      analysis.business_domain = 'Software Development'
    }

    // Determine architecture pattern
    if (analysis.tech_stack.devops.includes('Docker') || analysis.tech_stack.devops.includes('Docker Compose')) {
      analysis.architecture.pattern = 'Containerized'
      analysis.architecture.description = 'Application containerized with Docker'
    } else if (analysis.tech_stack.frontend.length > 0 && analysis.tech_stack.backend.length > 0) {
      analysis.architecture.pattern = 'Full-Stack'
      analysis.architecture.description = 'Full-stack application with separate frontend and backend'
    } else if (analysis.tech_stack.backend.length > 0) {
      analysis.architecture.pattern = 'Backend Service'
      analysis.architecture.description = 'Backend service or API'
    } else if (analysis.tech_stack.frontend.length > 0) {
      analysis.architecture.pattern = 'Frontend Application'
      analysis.architecture.description = 'Frontend application or UI component'
    } else {
      analysis.architecture.pattern = 'Library/Utility'
      analysis.architecture.description = 'A library/utility built with ' + analysis.tech_stack.languages.join(', ')
    }

    // Generate summary using Claude
    const summaryPrompt = `Analyze this repository and provide a brief summary:

Repository: ${repository.data.full_name}
Description: ${repository.data.description || 'No description'}
Languages: ${analysis.tech_stack.languages.join(', ')}
Architecture: ${analysis.architecture.pattern}
Business Domain: ${analysis.business_domain}

Provide a 2-3 sentence summary of what this repository does and its main purpose.`

    try {
      const summaryResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        temperature: 0.3,
        messages: [{ role: 'user', content: summaryPrompt }],
      })

      if (summaryResponse.content[0].type === 'text') {
        analysis.summary = summaryResponse.content[0].text
      }
    } catch (error) {
      console.error('Error generating summary:', error)
      analysis.summary = `${repository.data.full_name} is a ${analysis.business_domain.toLowerCase()} project.`
    }

  } catch (error) {
    console.error('Error analyzing repository:', error)
  }

  return analysis
}

async function generateDocumentationStructure(repoAnalysis: any) {
  // Use the enhanced ADocS Python service to generate documentation structure and store markdown files
  try {
    const { spawn } = require('child_process')
    
    // Prepare the metadata for the Python service
    const metadata = {
      github_url: repoAnalysis.github_repo,
      overview: repoAnalysis.overview,
      business_domain: repoAnalysis.business_domain,
      architecture: repoAnalysis.architecture,
      tech_stack: repoAnalysis.tech_stack
    }
    
    // Call the enhanced Python service
    const pythonProcess = spawn('/usr/local/bin/python3', [
      '/Users/sekharcidambi/adocs/enhanced_adocs_service.py',
      'generate',
      JSON.stringify(metadata),
      process.env.ANTHROPIC_API_KEY || ''
    ], {
      cwd: '/Users/sekharcidambi/adocs', // Set working directory
      env: { ...process.env, PYTHONPATH: '/Users/sekharcidambi/adocs' } // Set Python path
    })
    
    let output = ''
    let errorOutput = ''
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })
    
    // Wait for the process to complete
    await new Promise((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Python process exited with code ${code}: ${errorOutput}`))
        }
      })
    })
    
    // Parse the JSON response from enhanced service
    const result = JSON.parse(output)
    
    console.log('Enhanced ADocS response:', JSON.stringify(result, null, 2))
    
    // Log the files that were created
    if (result.success && result.files_created) {
      console.log('📁 Generated documentation files:')
      console.log(`   Output Directory: ${result.output_directory}`)
      console.log(`   Markdown Files: ${result.files_created.markdown_files.length}`)
      console.log(`   Index File: ${result.files_created.index}`)
    }
    
    // Return the documentation structure for the API
    return result.documentation_structure
    
  } catch (error) {
    console.error('Error calling enhanced ADocS service:', error)
    
    // Fallback to basic structure if ADocS fails
    const structure = {
      sections: [
        {
          title: 'Getting Started',
          subsections: ['Installation', 'Quick Start', 'Configuration']
        },
        {
          title: 'Architecture',
          subsections: ['System Overview', 'Components', 'Data Flow']
        },
        {
          title: 'Development',
          subsections: ['Setup', 'Testing', 'Deployment']
        },
        {
          title: 'API Reference',
          subsections: ['Endpoints', 'Authentication', 'Examples']
        },
        {
          title: 'Contributing',
          subsections: ['Guidelines', 'Code Style', 'Pull Requests']
        }
      ]
    }

    return structure
  }
}

async function fetchAndEnhanceDocumentation(owner: string, repo: string, docStructure: any, repoAnalysis: any) {
  const pages = []

  try {
    // Fetch README content for context
    let readmeContent = ''
    try {
      const readmeResponse = await octokit.rest.repos.getReadme({
        owner,
        repo,
      })
      readmeContent = Buffer.from(readmeResponse.data.content, 'base64').toString()
    } catch (error) {
      console.log('No README found or accessible')
      readmeContent = 'No README content available'
    }

    // Handle ADocS format: array with root object containing children
    if (Array.isArray(docStructure) && docStructure.length > 0) {
      const rootItem = docStructure[0]
      
      // Process ALL sections recursively, including deeply nested ones
      const processAllSections = async (items: any[], parentPath: string = '', parentTitle: string = '') => {
        for (const item of items) {
          const itemPath = parentPath ? `${parentPath}/${item.title.toLowerCase().replace(/\s+/g, '-')}` : item.title.toLowerCase().replace(/\s+/g, '-')
          const sectionTitle = parentTitle ? `${parentTitle} > ${item.title}` : item.title
          
          try {
            console.log(`🔄 Generating content for: ${sectionTitle}`)
            
            // Generate additional context based on the specific section
            const additionalContext = generateSectionSpecificContext(item.title, repoAnalysis)
            
            const enhancedContent = await generateEnhancedSectionContent(
              parentTitle || 'Documentation',
              item.title,
              owner,
              repo,
              repoAnalysis,
              readmeContent,
              additionalContext
            )
            
            pages.push({
              title: item.title,
              content: enhancedContent,
              path: itemPath,
              type: 'docs',
              section: parentTitle || 'Documentation',
              subsection: item.title,
              fullPath: sectionTitle
            })
            
            console.log(`✅ Generated content for: ${sectionTitle}`)
            
            // Add a small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 500))
            
          } catch (error) {
            console.error(`❌ Failed to generate content for ${sectionTitle}:`, error)
            
            // If it's a rate limit error, wait longer before continuing
            if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
              console.log('⏳ Rate limit hit, waiting 10 seconds before continuing...')
              await new Promise(resolve => setTimeout(resolve, 10000))
            }
          }
          
          // Recursively process nested children
          if (item.children && Array.isArray(item.children) && item.children.length > 0) {
            await processAllSections(item.children, itemPath, sectionTitle)
          }
        }
      }
      
      // Process all root-level items and their children
      if (rootItem.children && Array.isArray(rootItem.children)) {
        await processAllSections(rootItem.children)
      }
    } else if (docStructure.sections && Array.isArray(docStructure.sections)) {
      // Fallback: Handle old format (sections with subsections)
      for (const section of docStructure.sections) {
        if (section.subsections && Array.isArray(section.subsections)) {
          for (const item of section.subsections) {
            try {
              const additionalContext = generateSectionSpecificContext(item, repoAnalysis)
              
              const enhancedContent = await generateEnhancedSectionContent(
                section.title,
                item,
                owner,
                repo,
                repoAnalysis,
                readmeContent,
                additionalContext
              )
              
              pages.push({
                title: item,
                content: enhancedContent,
                path: `${section.title.toLowerCase().replace(/\s+/g, '-')}/${item.toLowerCase().replace(/\s+/g, '-')}.md`,
                type: 'docs',
                section: section.title,
                subsection: item,
              })
            } catch (error) {
              console.error(`Failed to generate content for ${section.title}/${item}:`, error)
            }
          }
        }
      }
    }

    console.log(`📊 Total pages generated: ${pages.length}`)
    console.log(`📋 Pages created:`, pages.map(p => p.fullPath || p.title))

  } catch (error) {
    console.error('Error fetching documentation:', error)
  }

  return pages
}

function generateSectionSpecificContext(sectionTitle: string, repoAnalysis: any): string {
  const context = []
  
  // Add section-specific context based on the title
  if (sectionTitle.toLowerCase().includes('getting started') || sectionTitle.toLowerCase().includes('installation')) {
    context.push(`
GETTING STARTED CONTEXT:
- Use the actual setup commands: ${repoAnalysis.setup.install || 'Not specified'}
- Reference the actual technology stack for installation requirements
- Include the actual run command: ${repoAnalysis.setup.run || 'Not specified'}
- Mention the actual test command: ${repoAnalysis.setup.test || 'Not specified'}
`)
  }
  
  if (sectionTitle.toLowerCase().includes('architecture') || sectionTitle.toLowerCase().includes('design')) {
    context.push(`
ARCHITECTURE CONTEXT:
- This repository uses: ${repoAnalysis.architecture.pattern || 'Not specified'}
- Architecture description: ${repoAnalysis.architecture.description || 'Not specified'}
- Technology stack: ${JSON.stringify(repoAnalysis.tech_stack)}
`)
  }
  
  if (sectionTitle.toLowerCase().includes('api') || sectionTitle.toLowerCase().includes('endpoint')) {
    context.push(`
API CONTEXT:
- Backend technology: ${repoAnalysis.tech_stack.backend.join(', ') || 'Not specified'}
- Frontend technology: ${repoAnalysis.tech_stack.frontend.join(', ') || 'Not specified'}
- Database: ${repoAnalysis.tech_stack.databases.join(', ') || 'Not specified'}
`)
  }
  
  if (sectionTitle.toLowerCase().includes('deployment') || sectionTitle.toLowerCase().includes('production')) {
    context.push(`
DEPLOYMENT CONTEXT:
- DevOps tools: ${repoAnalysis.tech_stack.devops.join(', ') || 'Not specified'}
- Architecture pattern: ${repoAnalysis.architecture.pattern || 'Not specified'}
- License: ${repoAnalysis.metadata.license || 'Not specified'}
`)
  }
  
  return context.join('\n')
}

async function generateEnhancedSectionContent(
  section: string, 
  subsection: string, 
  owner: string, 
  repo: string,
  repoAnalysis: any,
  readmeContent: string,
  additionalContext: string = ''
) {
  try {
    // Build comprehensive context from actual repository data
    const repositoryContext = `
REPOSITORY: ${owner}/${repo}
DESCRIPTION: ${repoAnalysis.overview || 'No description available'}
BUSINESS DOMAIN: ${repoAnalysis.business_domain || 'Not specified'}

TECHNOLOGY STACK:
- Languages: ${repoAnalysis.tech_stack.languages.join(', ') || 'Not detected'}
- Frontend: ${repoAnalysis.tech_stack.frontend.join(', ') || 'Not detected'}
- Backend: ${repoAnalysis.tech_stack.backend.join(', ') || 'Not detected'}
- Databases: ${repoAnalysis.tech_stack.databases.join(', ') || 'Not detected'}
- DevOps: ${repoAnalysis.tech_stack.devops.join(', ') || 'Not detected'}

ARCHITECTURE:
- Pattern: ${repoAnalysis.architecture.pattern || 'Not specified'}
- Description: ${repoAnalysis.architecture.description || 'Not specified'}

SETUP COMMANDS:
- Install: ${repoAnalysis.setup.install || 'Not specified'}
- Run: ${repoAnalysis.setup.run || 'Not specified'}
- Test: ${repoAnalysis.setup.test || 'Not specified'}

REPOSITORY METADATA:
- Stars: ${repoAnalysis.metadata.stars}
- Forks: ${repoAnalysis.metadata.forks}
- License: ${repoAnalysis.metadata.license}
- Status: ${repoAnalysis.metadata.status}

README CONTENT:
${readmeContent}

${additionalContext}
`

    const prompt = `You are creating comprehensive documentation for a GitHub repository. 

CRITICAL INSTRUCTIONS:
- Generate content SPECIFIC to the actual repository described below
- Use ONLY the information provided about this specific repository
- Do NOT use generic knowledge or information about similar projects
- Base your content on the actual technology stack, architecture, and setup commands provided
- Reference the actual README content when relevant
- If information is missing or "Not specified", acknowledge this limitation
- Be specific about the actual implementation, not theoretical concepts

REPOSITORY CONTEXT:
${repositoryContext}

TASK: Create detailed content for the section "${section}" and subsection "${subsection}".

REQUIREMENTS:
- Provide practical, actionable content specific to THIS repository
- Include code examples based on the actual technology stack
- Reference the actual setup commands and architecture
- Explain how this specific repository implements the concepts
- Include best practices relevant to the actual tech stack used
- Mention any limitations or considerations specific to this implementation

Format the response as markdown.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500, // Increased for more detailed content
      temperature: 0.2, // Lower temperature for more focused, factual content
      messages: [{ role: 'user', content: prompt }],
    })

    if (response.content[0].type === 'text') {
      return response.content[0].text
    }

    return `# ${subsection}\n\nContent for ${subsection} in ${section} section.`
  } catch (error) {
    console.error('Error generating enhanced content:', error)
    return `# ${subsection}\n\nContent for ${subsection} in ${section} section.`
  }
}

function buildNavigationStructure(docStructure: any, pages: any[]) {
  const navigation = []

  // Handle ADocS format: array with root object containing children
  if (Array.isArray(docStructure) && docStructure.length > 0) {
    const rootItem = docStructure[0]
    
    // Create a hierarchical structure that preserves the nesting and includes all generated pages
    const buildHierarchy = (items: any[], parentPath: string = '', parentTitle: string = ''): any[] => {
      const result: any[] = []
      for (const item of items) {
        const itemPath = parentPath ? `${parentPath}/${item.title.toLowerCase().replace(/\s+/g, '-')}` : item.title.toLowerCase().replace(/\s+/g, '-')
        const sectionTitle = parentTitle ? `${parentTitle} > ${item.title}` : item.title
        
        // Find the corresponding page for this item
        const correspondingPage = pages.find(page => 
          page.fullPath === sectionTitle || 
          (page.section === (parentTitle || 'Documentation') && page.subsection === item.title)
        )
        
        const childItem: any = {
          title: item.title,
          path: itemPath,
          type: 'docs',
          hasContent: !!correspondingPage,
          content: correspondingPage?.content || null
        }
        
        // If this item has children, add them as nested children
        if (item.children && Array.isArray(item.children) && item.children.length > 0) {
          childItem.children = buildHierarchy(item.children, itemPath, sectionTitle)
        }
        
        result.push(childItem)
      }
      return result
    }
    
    // Build navigation from the root item's children
    if (rootItem.children && Array.isArray(rootItem.children)) {
      return buildHierarchy(rootItem.children)
    }
  }
  
  // Fallback: Handle old format (sections with subsections)
  if (docStructure.sections && Array.isArray(docStructure.sections)) {
    for (const section of docStructure.sections) {
      const sectionPages = pages.filter(page => page.section === section.title)
      
      if (section.subsections && Array.isArray(section.subsections)) {
        navigation.push({
          title: section.title,
          path: section.title.toLowerCase().replace(/\s+/g, '-'),
          children: sectionPages.map(page => ({
            title: page.subsection,
            path: page.path,
            type: page.type,
            hasContent: true,
            content: page.content
          }))
        })
      } else {
        navigation.push({
          title: section.title,
          path: section.title.toLowerCase().replace(/\s+/g, '-'),
          children: []
        })
      }
    }
  }

  return navigation
}