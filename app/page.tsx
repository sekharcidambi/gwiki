'use client'

import { useState } from 'react'
import { Github, Search, BookOpen, Zap, Users, Star } from 'lucide-react'
import RepoInput from '@/components/RepoInput'
import WikiGenerator from '@/components/WikiGenerator'

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [wikiData, setWikiData] = useState(null)

  const handleGenerateWiki = async (url: string) => {
    setIsGenerating(true)
    setRepoUrl(url)
    
    try {
      const response = await fetch('/api/generate-wiki', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl: url }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setWikiData(data)
      } else {
        throw new Error('Failed to generate wiki')
      }
    } catch (error) {
      console.error('Error generating wiki:', error)
      alert('Failed to generate wiki. Please check the repository URL and try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (wikiData) {
    return <WikiGenerator wikiData={wikiData} repoUrl={repoUrl} />
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">GWiki</h1>
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
            Instant GitHub Repository
            <span className="text-primary-600"> Wikis</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Transform any GitHub repository into a beautiful, AI-enhanced wiki in seconds. 
            Powered by Claude AI for intelligent content summarization and documentation enhancement.
          </p>
          
          <div className="mt-8">
            <RepoInput onGenerate={handleGenerateWiki} isLoading={isGenerating} />
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="card text-center">
            <div className="flex justify-center">
              <Zap className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">AI Enhanced</h3>
            <p className="mt-2 text-gray-600">
              Powered by Claude AI for intelligent content summarization, enhancement, and key insights.
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center">
              <Search className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Smart Search</h3>
            <p className="mt-2 text-gray-600">
              Full-text search across all documentation with AI-powered insights and summaries.
            </p>
          </div>

          <div className="card text-center">
            <div className="flex justify-center">
              <Users className="h-12 w-12 text-primary-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Team Ready</h3>
            <p className="mt-2 text-gray-600">
              Share AI-enhanced wikis with your team. Perfect for onboarding and knowledge sharing.
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
              <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
              <p className="mt-2 text-gray-600">
                Claude AI analyzes the repository structure, README files, and documentation for intelligent enhancement.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Get Your Wiki</h3>
              <p className="mt-2 text-gray-600">
                Receive a beautiful, organized wiki with search functionality and navigation.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 