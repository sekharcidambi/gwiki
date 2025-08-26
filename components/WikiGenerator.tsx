'use client'

import { useState, useMemo } from 'react'
import { Search, ArrowLeft, BookOpen, FileText, Code, Users, Calendar, Star } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'

interface WikiData {
  repository: {
    name: string
    description: string
    owner: string
    stars: number
    language: string
    topics: string[]
    createdAt: string
    updatedAt: string
    summary: string
  }
  pages: {
    title: string
    content: string
    path: string
    type: 'readme' | 'docs' | 'code' | 'other'
    originalContent: string
    enhancedContent: string
    summary: string
    keyPoints: string[]
    suggestedImprovements: string[]
  }[]
  structure: {
    title: string
    path: string
    children?: { title: string; path: string }[]
  }[]
}

interface WikiGeneratorProps {
  wikiData: WikiData
  repoUrl: string
  onBack?: () => void
}

export default function WikiGenerator({ wikiData, repoUrl, onBack }: WikiGeneratorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPage, setSelectedPage] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showEnhanced, setShowEnhanced] = useState(true)

  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return wikiData.pages
    
    const query = searchQuery.toLowerCase()
    return wikiData.pages.filter(page => 
      page.title.toLowerCase().includes(query) ||
      page.content.toLowerCase().includes(query)
    )
  }, [wikiData.pages, searchQuery])

  const currentPage = selectedPage 
    ? wikiData.pages.find(p => p.path === selectedPage)
    : wikiData.pages[0]

  const displayContent = showEnhanced && currentPage?.enhancedContent 
    ? currentPage.enhancedContent 
    : currentPage?.originalContent || currentPage?.content || ''

  const extractRepoInfo = (url: string) => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    return match ? { owner: match[1], repo: match[2] } : null
  }

  const repoInfo = extractRepoInfo(repoUrl)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack || (() => window.location.reload())}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>New Deep Dive</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-primary-600" />
                <h1 className="text-xl font-semibold text-gray-900">DeepDive</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search deep dive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-white shadow-sm border-r transition-all duration-300`}>
          <div className="p-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100"
            >
              <span className={`font-medium ${sidebarOpen ? 'block' : 'hidden'}`}>Navigation</span>
              <BookOpen className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          
          {sidebarOpen && (
            <div className="px-4 pb-4">
              {/* Repository Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{wikiData.repository.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{wikiData.repository.description}</p>
                
                {wikiData.repository.summary && (
                  <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <h4 className="text-sm font-semibold text-blue-900 mb-1">AI Summary</h4>
                    <p className="text-xs text-blue-800">{wikiData.repository.summary}</p>
                  </div>
                )}
                
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{wikiData.repository.owner}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span>{wikiData.repository.stars}</span>
                  </div>
                </div>
                
                {wikiData.repository.language && (
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded">
                      {wikiData.repository.language}
                    </span>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                {wikiData.structure.map((item) => (
                  <div key={item.path}>
                    <button
                      onClick={() => setSelectedPage(item.path)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedPage === item.path
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {item.title}
                    </button>
                    {item.children && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <button
                            key={child.path}
                            onClick={() => setSelectedPage(child.path)}
                            className={`w-full text-left px-3 py-1 rounded text-sm transition-colors ${
                              selectedPage === child.path
                                ? 'bg-primary-50 text-primary-800'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {child.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {currentPage ? (
            <div className="max-w-4xl mx-auto p-8">
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-3xl font-bold text-gray-900">{currentPage.title}</h1>
                  {currentPage.enhancedContent && currentPage.enhancedContent !== currentPage.originalContent && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowEnhanced(!showEnhanced)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          showEnhanced
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {showEnhanced ? 'Enhanced' : 'Original'}
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <FileText className="h-4 w-4" />
                    <span>{currentPage.path}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Code className="h-4 w-4" />
                    <span className="capitalize">{currentPage.type}</span>
                  </div>
                </div>

                {/* AI Summary */}
                {currentPage.summary && currentPage.summary !== 'Unable to generate summary.' && (
                  <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">AI Summary</h3>
                    <p className="text-sm text-blue-800">{currentPage.summary}</p>
                  </div>
                )}

                {/* Key Points */}
                {currentPage.keyPoints && currentPage.keyPoints.length > 0 && (
                  <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-lg">
                    <h3 className="text-sm font-semibold text-green-900 mb-2">Key Points</h3>
                    <ul className="text-sm text-green-800 space-y-1">
                      {currentPage.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-600 mr-2">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Improvements */}
                {currentPage.suggestedImprovements && currentPage.suggestedImprovements.length > 0 && (
                  <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                    <h3 className="text-sm font-semibold text-yellow-900 mb-2">Suggested Improvements</h3>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {currentPage.suggestedImprovements.map((improvement, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-yellow-600 mr-2">💡</span>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="prose prose-lg max-w-none">
                <MarkdownRenderer content={displayContent} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a page from the sidebar to view content</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 