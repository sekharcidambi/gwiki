'use client'

import { useState } from 'react'
import { Github, Search, BookOpen, Zap, Users, Star } from 'lucide-react'
import RepoInput from '@/components/RepoInput'
import EnhancedWikiGenerator from '@/components/EnhancedWikiGenerator'
import RepositoryTiles from '@/components/RepositoryTiles'
import RepositoryDocumentation from '@/components/RepositoryDocumentation'

interface NavigationItem {
  title: string
  path: string
  type?: string
  children?: NavigationItem[]
}

interface Repository {
  name: string
  github_url: string
  description: string
  language: string
  stars: number
  topics: string[]
  business_domain: string
  last_updated: string
  has_documentation: boolean
  has_wiki: boolean
  storage: {
    type: string
    bucket: string
  }
}

interface DocumentationPage {
  title: string
  content: string
  path: string
  type: 'readme' | 'docs' | 'code' | 'other'
  section: string
  subsection: string
}

interface WikiData {
  repository: any
  documentationStructure: any
  pages: DocumentationPage[]
  navigation: any[]
}

// Transform analysis service response to WikiData structure
function transformAnalysisToWikiData(analysisData: any) {
  console.log('Received analysis data:', analysisData)
  const analysis = analysisData.analysis || {}
  const docStructure = analysisData.documentation_structure || {}
  
  // Extract repository metadata
  const repository = {
    name: analysis.name || 'Unknown',
    description: analysis.description || '',
    owner: analysis.github_url?.split('/')[3] || 'Unknown',
    stars: analysis.metadata?.stars || 0,
    language: analysis.tech_stack?.languages?.[0] || 'Unknown',
    topics: analysis.metadata?.topics || [],
    createdAt: analysis.metadata?.created_at || '',
    updatedAt: analysis.metadata?.updated_at || '',
    businessDomain: analysis.business_domain || 'Unknown',
    techStack: {
      languages: analysis.tech_stack?.languages || [],
      frontend: analysis.tech_stack?.frontend || [],
      backend: analysis.tech_stack?.backend || [],
      databases: analysis.tech_stack?.databases || [],
      devops: analysis.tech_stack?.devops || []
    },
    architecture: {
      pattern: analysis.architecture?.pattern || 'Unknown',
      description: analysis.architecture?.description || ''
    },
    setup: {
      requirements: analysis.tech_stack?.languages || [],
      installation: 'See README for installation instructions',
      configuration: 'See documentation for configuration details'
    }
  }

  // Transform documentation structure
  const documentationStructure = {
    sections: docStructure.sections || []
  }

  // Create pages from enhanced sections
  const pages: DocumentationPage[] = []
  if (analysisData.enhanced_sections) {
    Object.entries(analysisData.enhanced_sections).forEach(([sectionTitle, content]) => {
      pages.push({
        title: sectionTitle,
        content: content as string,
        section: 'Overview',
        subsection: sectionTitle,
        path: sectionTitle.toLowerCase().replace(/\s+/g, '-'),
        type: 'docs' as const
      })
    })
  }

  // Create fallback pages if no enhanced sections are available
  if (pages.length === 0) {
    // Create basic pages from documentation structure
    if (docStructure.sections && docStructure.sections.length > 0) {
      docStructure.sections.forEach((section: any) => {
        pages.push({
          title: section.title || 'Overview',
          content: 'Content for this section is being generated...',
          section: 'Overview',
          subsection: section.title || 'Overview',
          path: (section.title || 'overview').toLowerCase().replace(/\s+/g, '-'),
          type: 'docs' as const
        })
      })
    } else {
      // Create a default overview page
      pages.push({
        title: 'Overview',
        content: 'Repository analysis is in progress. Content will be available shortly.',
        section: 'Overview',
        subsection: 'Overview',
        path: 'overview',
        type: 'docs' as const
      })
    }
  }

  // Create navigation structure from documentation structure
  const navigation: NavigationItem[] = []
  
  if (docStructure.sections && docStructure.sections.length > 0) {
    docStructure.sections.forEach((section: any) => {
      const sectionItem: NavigationItem = {
        title: section.title,
        path: section.title.toLowerCase().replace(/\s+/g, '-'),
        children: []
      }
      
      // Add subsections if they exist
      if (section.children && section.children.length > 0) {
        section.children.forEach((subsection: any) => {
          const subsectionItem: NavigationItem = {
            title: subsection.title,
            path: `${sectionItem.path}/${subsection.title.toLowerCase().replace(/\s+/g, '-')}`,
            children: []
          }
          
          // Add sub-subsections if they exist
          if (subsection.children && subsection.children.length > 0) {
            subsection.children.forEach((subsubsection: any) => {
              subsectionItem.children!.push({
                title: subsubsection.title,
                path: `${subsectionItem.path}/${subsubsection.title.toLowerCase().replace(/\s+/g, '-')}`,
                children: []
              })
            })
          }
          
          sectionItem.children!.push(subsectionItem)
        })
      }
      
      navigation.push(sectionItem)
    })
  } else {
    // Fallback to pages-based navigation
    navigation.push(...(pages || []).map(page => ({
      title: page.title,
      path: page.path,
      children: []
    })))
  }

  return {
    repository,
    documentationStructure,
    pages,
    navigation
  }
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [wikiData, setWikiData] = useState<WikiData | null>(null)
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null)

  const handleGenerateWiki = async (url: string) => {
    setIsGenerating(true)
    setRepoUrl(url)
    
    try {
      const response = await fetch('/api/analyze-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl: url }),
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          if (data.status === 'processing') {
            // Show user-friendly message for background processing
            alert(data.message)
            setIsGenerating(false)
            setRepoUrl('')
            return
          } else {
            // Handle immediate completion (fallback)
            const transformedData = transformAnalysisToWikiData(data)
            setWikiData(transformedData)
          }
        } else {
          throw new Error(data.error || 'Failed to analyze repository')
        }
      } else {
        throw new Error('Failed to analyze repository')
      }
    } catch (error) {
      console.error('Error analyzing repository:', error)
      alert('Failed to analyze repository. Please check the repository URL and try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRepositoryClick = (repository: Repository) => {
    setSelectedRepository(repository)
  }

  const handleBackToHome = () => {
    setSelectedRepository(null)
    setWikiData(null)
  }

  if (wikiData) {
    return <EnhancedWikiGenerator wikiData={wikiData} repoUrl={repoUrl} onBack={handleBackToHome} />
  }

  if (selectedRepository) {
    return <RepositoryDocumentation repository={selectedRepository} onBack={handleBackToHome} />
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">Glover Labs</h1>
              <span className="text-lg text-gray-500">Gloki</span>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-700"
              >
                <Github className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-6xl">
            GitHub Repository
            <span className="text-primary-600"> Analysis & Documentation</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Combine repository metadata analysis with intelligent documentation structure generation. 
            Get comprehensive technical insights, business domain classification, and structured documentation in one unified interface.
          </p>
          
          <div className="mt-8">
            <RepoInput onGenerate={handleGenerateWiki} isLoading={isGenerating} />
          </div>
        </div>

        {/* Repository Tiles */}
        <RepositoryTiles onRepositoryClick={handleRepositoryClick} />

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card text-center">
            <div className="flex justify-center">
              <Zap className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Repository Analysis</h3>
            <p className="mt-2 text-gray-600">
              Comprehensive metadata extraction including business domain, tech stack, architecture patterns, and setup instructions.
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center">
              <Search className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Documentation Structure</h3>
            <p className="mt-2 text-gray-600">
              AI-generated documentation structure with organized sections and subsections tailored to your repository.
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center">
              <Users className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Unified Interface</h3>
            <p className="mt-2 text-gray-600">
              Single interface combining repository metadata, documentation structure, and enhanced content with wiki-like navigation.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Paste Repository URL</h3>
              <p className="mt-2 text-gray-600">
                Simply paste any public GitHub repository URL into the input field above.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Repository Analysis</h3>
              <p className="mt-2 text-gray-600">
                System analyzes repository structure, extracts metadata, determines business domain, and identifies tech stack.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Documentation Structure</h3>
              <p className="mt-2 text-gray-600">
                AI generates tailored documentation structure and creates comprehensive content for each section.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 