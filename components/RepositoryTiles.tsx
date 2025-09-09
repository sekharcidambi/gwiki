'use client'

import { useState, useEffect } from 'react'
import { Github, Calendar, FileText, Star, ExternalLink, Loader2 } from 'lucide-react'

interface Repository {
  name: string
  github_url: string
  latest_version: string
  generated_at: string
  documentation_type: string
  available_sections: string[]
}

interface RepositoryTilesProps {
  onRepositoryClick: (repo: Repository) => void
}

export default function RepositoryTiles({ onRepositoryClick }: RepositoryTilesProps) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRepositories()
  }, [])

  const fetchRepositories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/get-repositories?type=docs')
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRepositories(data.repositories || [])
        } else {
          setError(data.error || 'Failed to fetch repositories')
        }
      } else {
        setError('Failed to fetch repositories')
      }
    } catch (error) {
      console.error('Error fetching repositories:', error)
      setError('Failed to fetch repositories')
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
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Unknown'
    }
  }

  const getRepositoryDisplayName = (name: string) => {
    // Convert "owner_repo" format to "owner/repo"
    return name.replace('_', '/')
  }

  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Previously Analyzed Repositories
        </h2>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading repositories...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Previously Analyzed Repositories
        </h2>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchRepositories}
            className="btn-secondary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (repositories.length === 0) {
    return (
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
          Previously Analyzed Repositories
        </h2>
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
            <Github className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No repositories yet</h3>
            <p className="text-gray-600">
              Analyze your first repository using the form above to see it appear here.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
        Previously Analyzed Repositories
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repositories.map((repo) => (
          <div
            key={repo.name}
            onClick={() => onRepositoryClick(repo)}
            className="card cursor-pointer hover:shadow-lg transition-shadow duration-200 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Github className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {getRepositoryDisplayName(repo.name)}
                </h3>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Analyzed {formatDate(repo.generated_at)}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <FileText className="h-4 w-4 mr-2" />
                <span>{repo.available_sections.length} sections</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Star className="h-4 w-4 mr-2" />
                <span>Version {repo.latest_version}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-1">
                {repo.available_sections.slice(0, 3).map((section) => (
                  <span
                    key={section}
                    className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                  >
                    {section}
                  </span>
                ))}
                {repo.available_sections.length > 3 && (
                  <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                    +{repo.available_sections.length - 3} more
                  </span>
                )}
              </div>
            </div>
            
            <div className="mt-4 text-center">
              <span className="text-sm text-primary-600 font-medium group-hover:text-primary-700">
                View Documentation →
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          Click on any repository to view its generated documentation
        </p>
      </div>
    </div>
  )
}
