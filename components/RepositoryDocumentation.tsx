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
  documentation_type: string
  generated_at: string
  structure: any
  sections: Record<string, string>
  available_sections: string[]
  hierarchical_sections: HierarchicalSection[]
  metadata: any
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
          setDocumentation(data)
          // Set first section as default if available
          if (data.available_sections && data.available_sections.length > 0) {
            setSelectedSection(data.available_sections[0])
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

  const shouldShowSection = (section: HierarchicalSection, index: number, sections: HierarchicalSection[]) => {
    if (section.level === 0) return true
    
    // Find the parent section
    for (let i = index - 1; i >= 0; i--) {
      const prevSection = sections[i]
      if (prevSection.level < section.level) {
        // This is the parent section
        return !isSectionCollapsed(prevSection.title)
      }
    }
    return true
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
                  <span>Generated {formatDate(documentation.generated_at)}</span>
                </div>
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  <span>{documentation.available_sections.length} sections</span>
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
                {documentation.hierarchical_sections?.map((section, index) => {
                  const isCollapsed = isSectionCollapsed(section.title)
                  const shouldShow = shouldShowSection(section, index, documentation.hierarchical_sections)
                  
                  if (!shouldShow) return null
                  
                  return (
                    <div key={section.title}>
                      <button
                        onClick={() => {
                          if (section.has_children) {
                            toggleSection(section.title)
                          } else {
                            setSelectedSection(section.title)
                          }
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedSection === section.title
                            ? 'bg-primary-100 text-primary-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        style={{
                          paddingLeft: `${12 + (section.level * 20)}px`,
                          borderLeft: section.level > 0 ? `2px solid ${section.level === 1 ? '#e5e7eb' : '#f3f4f6'}` : 'none',
                          marginLeft: section.level > 0 ? '8px' : '0px'
                        }}
                      >
                        <div className="flex items-center">
                          {section.has_children ? (
                            <span className="mr-2 text-gray-400 text-xs">
                              {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </span>
                          ) : (
                            <span className="mr-2 w-3"></span>
                          )}
                          <span className={`${section.level > 0 ? 'text-sm' : 'font-medium'} ${
                            section.level === 0 ? 'text-gray-900' : 
                            section.level === 1 ? 'text-gray-800' : 'text-gray-700'
                          }`}>
                            {section.title}
                          </span>
                        </div>
                      </button>
                    </div>
                  )
                }) || documentation.available_sections.map((section) => (
                  <button
                    key={section}
                    onClick={() => setSelectedSection(section)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedSection === section
                        ? 'bg-primary-100 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    {section}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedSection && documentation.sections[selectedSection] ? (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedSection}</h2>
                </div>
                <div className="p-6">
                  <MarkdownRenderer content={documentation.sections[selectedSection]} />
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
