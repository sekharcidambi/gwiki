'use client'

import { useState, useMemo } from 'react'
import { 
  Search, 
  ArrowLeft, 
  BookOpen, 
  FileText, 
  Code, 
  Users, 
  Calendar, 
  Star,
  Building2,
  Layers,
  Database,
  Settings,
  Shield,
  Zap,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Tag,
  Menu,
  X
} from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'

interface RepositoryMetadata {
  name: string
  description: string
  owner: string
  stars: number
  language: string
  topics: string[]
  createdAt: string
  updatedAt: string
  businessDomain: string
  techStack: {
    languages: string[]
    frontend: string[]
    backend: string[]
    databases: string[]
    devops: string[]
  }
  architecture: {
    pattern: string
    description: string
  }
  setup: {
    install: string
    run: string
    test: string
  }
  metadata: {
    stars: number
    forks: number
    license: string
    status: string
  }
  summary: string
}

interface DocumentationPage {
  title: string
  content: string
  path: string
  type: 'readme' | 'docs' | 'code' | 'other'
  section: string
  subsection: string
}

interface NavigationItem {
  title: string
  path: string
  type?: string
  children?: NavigationItem[]
}

interface WikiData {
  repository: RepositoryMetadata
  documentationStructure: {
    sections: {
      title: string
      subsections: string[]
    }[]
  }
  pages: DocumentationPage[]
  navigation: NavigationItem[]
}

interface EnhancedWikiGeneratorProps {
  wikiData: WikiData
  repoUrl: string
  onBack?: () => void
}

// Recursive navigation component for handling nested structure
function NavigationSection({ 
  item, 
  expandedSections, 
  selectedPage, 
  onToggleSection, 
  onSelectPage, 
  level 
}: {
  item: NavigationItem
  expandedSections: Set<string>
  selectedPage: string | null
  onToggleSection: (title: string) => void
  onSelectPage: (path: string) => void
  level: number
}) {
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedSections.has(item.title)
  const isSelected = selectedPage === item.path

  return (
    <div>
      <button
        onClick={() => hasChildren ? onToggleSection(item.title) : onSelectPage(item.path)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isSelected && !hasChildren
            ? 'bg-primary-100 text-primary-900'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${12 + level * 24}px` }}
      >
        <span>{item.title}</span>
        {hasChildren && (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )
        )}
      </button>
      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {(item.children || []).map((child) => (
            <NavigationSection
              key={child.path}
              item={child}
              expandedSections={expandedSections}
              selectedPage={selectedPage}
              onToggleSection={onToggleSection}
              onSelectPage={onSelectPage}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function EnhancedWikiGenerator({ wikiData, repoUrl, onBack }: EnhancedWikiGeneratorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPage, setSelectedPage] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Overview']))
  // Remove tab state since we're only showing ADocS content

  const filteredPages = useMemo(() => {
    if (!wikiData.pages) return []
    if (!searchQuery.trim()) return wikiData.pages
    
    const query = searchQuery.toLowerCase()
    return wikiData.pages.filter(page => 
      page.title.toLowerCase().includes(query) ||
      page.content.toLowerCase().includes(query) ||
      page.section.toLowerCase().includes(query) ||
      page.subsection.toLowerCase().includes(query)
    )
  }, [wikiData.pages, searchQuery])

  const currentPage = selectedPage 
    ? wikiData.pages?.find(p => p.path === selectedPage)
    : wikiData.pages?.[0]

  const toggleSection = (sectionTitle: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionTitle)) {
      newExpanded.delete(sectionTitle)
    } else {
      newExpanded.add(sectionTitle)
    }
    setExpandedSections(newExpanded)
  }

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
                <span className="hidden sm:inline">New Analysis</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-primary-600" />
                <h1 className="text-xl font-semibold text-gray-900">Glover Labs</h1>
                <span className="text-sm text-gray-500">Gloki</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search repository..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Enhanced Sidebar */}
        <div className={`${sidebarOpen ? 'sidebar-responsive' : 'sidebar-collapsed'} bg-white shadow-sm border-r transition-all duration-300`}>
          <div className="p-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100"
            >
              <span className={`font-medium ${sidebarOpen ? 'block' : 'hidden'}`}>Repository Analysis</span>
              <BookOpen className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          
          {sidebarOpen && (
            <div className="px-4 pb-4">
              {/* Mobile Search */}
              <div className="md:hidden mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search repository..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              {/* Repository Title Only */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{wikiData.repository.name}</h3>
                </div>
                
                {/* Generated Files Info */}
                {(wikiData as any).generatedFiles && (wikiData as any).generatedFiles.hasMarkdownFiles && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-700">
                        📁 Documentation saved as markdown files
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Documentation Navigation Header */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Documentation Structure</h3>
              </div>

              {/* ADocS Documentation Navigation */}
              <div>
                <nav className="space-y-1">
                  {(wikiData.navigation || []).map((item) => (
                    <NavigationSection
                      key={item.path}
                      item={item}
                      expandedSections={expandedSections}
                      selectedPage={selectedPage}
                      onToggleSection={toggleSection}
                      onSelectPage={setSelectedPage}
                      level={0}
                    />
                  ))}
                </nav>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - ADocS Generated Content Only */}
        <div className="flex-1">
          {currentPage ? (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{currentPage.title}</h1>
                <div className="flex items-center space-x-1 text-sm text-gray-500 mt-2">
                  <FileText className="h-4 w-4" />
                  <span>AI-Generated Documentation</span>
                </div>
              </div>
              
              <div className="prose prose-lg max-w-none">
                <MarkdownRenderer content={currentPage.content} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select a documentation section from the sidebar to view AI-generated content</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
