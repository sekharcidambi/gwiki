'use client'

import { useState } from 'react'
import { Github, Loader2 } from 'lucide-react'

interface RepoInputProps {
  onGenerate: (url: string) => void
  isLoading: boolean
}

export default function RepoInput({ onGenerate, isLoading }: RepoInputProps) {
  const [repoUrl, setRepoUrl] = useState('')
  const [error, setError] = useState('')

  const validateGitHubUrl = (url: string): boolean => {
    const githubRegex = /^https?:\/\/github\.com\/[^\/]+\/[^\/]+(?:\/)?$/
    return githubRegex.test(url)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!repoUrl.trim()) {
      setError('Please enter a repository URL')
      return
    }

    if (!validateGitHubUrl(repoUrl.trim())) {
      setError('Please enter a valid GitHub repository URL (e.g., https://github.com/username/repo)')
      return
    }

    onGenerate(repoUrl.trim())
  }

  const handleExampleClick = () => {
    setRepoUrl('https://github.com/vercel/next.js')
    setError('')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Github className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => {
              setRepoUrl(e.target.value)
              setError('')
            }}
            placeholder="https://github.com/username/repository"
            className="input-field pl-10 text-lg"
            disabled={isLoading}
          />
        </div>
        
        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex items-center justify-center text-lg py-3 px-8"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating Analysis...
              </>
            ) : (
              'Generate Analysis'
            )}
          </button>
          
          <button
            type="button"
            onClick={handleExampleClick}
            disabled={isLoading}
            className="btn-secondary text-lg py-3 px-8"
          >
            Try Example
          </button>
        </div>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Works with any public GitHub repository
        </p>
      </div>
    </div>
  )
} 