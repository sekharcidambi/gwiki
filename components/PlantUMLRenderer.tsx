'use client'

import { useEffect, useRef, useState } from 'react'

interface PlantUMLRendererProps {
  code: string
  className?: string
}

export default function PlantUMLRenderer({ code, className = '' }: PlantUMLRendererProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const renderPlantUML = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Encode the PlantUML code for the URL
        const encodedCode = encodeURIComponent(code)
        
        // Use PlantUML server to generate the diagram
        const plantUMLServer = 'https://www.plantuml.com/plantuml/svg/'
        const diagramUrl = `${plantUMLServer}${encodedCode}`
        
        setImageUrl(diagramUrl)
      } catch (err) {
        console.error('Error rendering PlantUML:', err)
        setError('Failed to render PlantUML diagram')
      } finally {
        setIsLoading(false)
      }
    }

    if (code) {
      renderPlantUML()
    }
  }, [code])

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
          <span className="text-sm text-gray-600">Rendering diagram...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="text-red-600">⚠️</div>
          <span className="text-sm text-red-700">{error}</span>
        </div>
        <details className="mt-2">
          <summary className="text-xs text-red-600 cursor-pointer">Show PlantUML code</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
            <code>{code}</code>
          </pre>
        </details>
      </div>
    )
  }

  if (!imageUrl) {
    return null
  }

  return (
    <div className={`flex justify-center ${className}`}>
      <div className="max-w-full overflow-x-auto">
        <img
          src={imageUrl}
          alt="PlantUML Diagram"
          className="max-w-full h-auto"
          onError={() => setError('Failed to load diagram image')}
        />
      </div>
    </div>
  )
}
