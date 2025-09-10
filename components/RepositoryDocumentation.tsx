'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, Calendar, Github, ExternalLink, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'

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

interface HierarchicalSection {
  title: string
  level: number
  has_children: boolean
}

interface DocumentationData {
  success: boolean
  repository: string
  documentationStructure: Array<{
    title: string
    children: Array<{
      title: string
      children: any[]
    }>
  }>
  navigation: any[]
  metadata: any
  storage: {
    type: string
    bucket: string
  }
}

interface RepositoryDocumentationProps {
  repository: Repository
  onBack: () => void
}

export default function RepositoryDocumentation({ repository, onBack }: RepositoryDocumentationProps) {
  const [documentation, setDocumentation] = useState<DocumentationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [sectionContent, setSectionContent] = useState<string>('')
  const [contentLoading, setContentLoading] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchDocumentation()
  }, [repository])

  const fetchDocumentation = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch(`/api/get-documentation?repo=${encodeURIComponent(repository.github_url)}&type=docs`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Ensure documentationStructure is an array
          const docData = {
            ...data,
            documentationStructure: Array.isArray(data.documentationStructure) ? data.documentationStructure : []
          }
          setDocumentation(docData)
          // Set first section as default if available
          if (docData.documentationStructure && docData.documentationStructure.length > 0) {
            const firstSection = docData.documentationStructure[0].title
            setSelectedSection(firstSection)
            fetchSectionContent(firstSection)
          }
        } else {
          setError(data.error || 'Failed to fetch documentation')
        }
      } else {
        setError('Failed to fetch documentation')
      }
    } catch (error) {
      console.error('Error fetching documentation:', error)
      setError('Failed to fetch documentation')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown'
    }
  }

  const getRepositoryDisplayName = (name: string) => {
    return name.replace('_', '/')
  }

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionTitle)) {
        newSet.delete(sectionTitle)
      } else {
        newSet.add(sectionTitle)
      }
      return newSet
    })
  }

  const isSectionCollapsed = (sectionTitle: string) => {
    return collapsedSections.has(sectionTitle)
  }

  const fetchSectionContent = async (sectionTitle: string) => {
    if (!repository.github_url) return
    
    try {
      setContentLoading(true)
      const response = await fetch(`/api/get-documentation?repo=${encodeURIComponent(repository.github_url)}&section=${encodeURIComponent(sectionTitle)}&type=docs`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.content) {
          setSectionContent(data.content)
        } else {
          setSectionContent('Content not available for this section.')
        }
      } else {
        setSectionContent('Failed to load content for this section.')
      }
    } catch (error) {
      console.error('Error fetching section content:', error)
      setSectionContent('Error loading content for this section.')
    } finally {
      setContentLoading(false)
    }
  }

  const handleSectionClick = (sectionTitle: string) => {
    setSelectedSection(sectionTitle)
    fetchSectionContent(sectionTitle)
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center mb-8">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </button>
          </div>
          
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <span className="ml-2 text-gray-600">Loading documentation...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center mb-8">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </button>
          </div>
          
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Documentation</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchDocumentation}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!documentation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center mb-8">
            <button
              onClick={onBack}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </button>
          </div>
          
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Documentation Found</h2>
            <p className="text-gray-600">No documentation was found for this repository.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </button>
          
          <a
            href={repository.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Github className="h-5 w-5 mr-2" />
            View on GitHub
            <ExternalLink className="h-4 w-4 ml-1" />
          </a>
        </div>

        {/* Repository Info */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {getRepositoryDisplayName(repository.name)}
              </h1>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Generated {formatDate(documentation.metadata?.generated_at || 'Unknown')}</span>
                </div>
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  <span>{documentation.documentationStructure?.length || 0} sections</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              <nav className="space-y-1">
                {(documentation.documentationStructure || []).map((section) => (
                  <div key={section.title}>
                    <button
                      onClick={() => {
                        if (section.children && section.children.length > 0) {
                          toggleSection(section.title)
                        } else {
                          handleSectionClick(section.title)
                        }
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedSection === section.title
                          ? 'bg-primary-100 text-primary-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <div className="flex items-center">
                        {section.children && section.children.length > 0 ? (
                          <span className="mr-2 text-gray-400 text-xs">
                            {isSectionCollapsed(section.title) ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </span>
                        ) : (
                          <span className="mr-2 w-3"></span>
                        )}
                        <span className="font-medium text-gray-900">
                          {section.title}
                        </span>
                      </div>
                    </button>
                    
                    {/* Render children if expanded */}
                    {section.children && section.children.length > 0 && !isSectionCollapsed(section.title) && (
                      <div className="ml-4 space-y-1">
                        {(section.children || []).map((child) => (
                          <button
                            key={child.title}
                            onClick={() => handleSectionClick(child.title)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              selectedSection === child.title
                                ? 'bg-primary-100 text-primary-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                          >
                            <span className="text-sm text-gray-800">
                              {child.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )) || []}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedSection ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedSection}</h2>
                </div>
                <div className="p-6">
                  {contentLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                      <span className="ml-2 text-gray-600">Loading content...</span>
                    </div>
                  ) : sectionContent ? (
                    <MarkdownRenderer content={sectionContent} />
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Content Not Available</h3>
                      <p className="text-gray-600">
                        The content for this section is not yet available. This may be because the documentation is still being generated or the section content needs to be fetched separately.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Section</h3>
                <p className="text-gray-600">Choose a documentation section from the sidebar to view its content.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
