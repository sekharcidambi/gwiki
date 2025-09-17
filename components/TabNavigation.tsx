'use client'

import { useState } from 'react'
import { BookOpen, FileText, ExternalLink } from 'lucide-react'

interface TabNavigationProps {
  activeTab: 'repository' | 'requirements'
  onTabChange: (tab: 'repository' | 'requirements') => void
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    {
      id: 'repository' as const,
      label: 'Repository Analysis',
      icon: BookOpen,
      description: 'Generate documentation from GitHub repositories'
    },
    {
      id: 'requirements' as const,
      label: 'Requirements Management',
      icon: FileText,
      description: 'Manage requirements and user stories',
      external: true,
      url: 'https://gloki-requirements.vercel.app'
    }
  ]

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.external && tab.url) {
      window.open(tab.url, '_blank', 'noopener,noreferrer')
    } else {
      onTabChange(tab.id)
    }
  }

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`
                  group flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
                {tab.external && (
                  <ExternalLink className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
