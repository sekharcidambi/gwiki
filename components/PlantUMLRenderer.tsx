'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react'

interface PlantUMLRendererProps {
  code: string
  format?: 'svg' | 'png' | 'pdf'
  serverUrl?: string
  className?: string
}

export default function PlantUMLRenderer({ 
  code, 
  format = 'svg', 
  serverUrl = 'https://www.plantuml.com/plantuml',
  className = ''
}: PlantUMLRendererProps) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [fallbackMode, setFallbackMode] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Clean and validate PlantUML code
  const cleanCode = (rawCode: string): string => {
    // Remove markdown code block markers if present
    let cleaned = rawCode
      .replace(/^```plantuml\s*\n?/i, '')
      .replace(/^```\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim()

    // Ensure proper PlantUML tags
    if (!cleaned.includes('@startuml')) {
      cleaned = `@startuml\n${cleaned}`
    }
    if (!cleaned.includes('@enduml')) {
      cleaned = `${cleaned}\n@enduml`
    }

    return cleaned
  }

  // Generate PlantUML URL
  const generatePlantUMLUrl = (umlCode: string): string => {
    try {
      // Encode the PlantUML code using the same algorithm as PlantUML.com
      const encoded = encodePlantUML(umlCode)
      return `${serverUrl}/${format}/${encoded}`
    } catch (err) {
      throw new Error('Failed to encode PlantUML code')
    }
  }

  // Simple PlantUML encoding (basic implementation)
  const encodePlantUML = (text: string): string => {
    // This is a simplified version - in production, you might want to use a proper library
    const compressed = text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*/g, '\n')
      .trim()
    
    // Basic encoding - for production, consider using plantuml-encoder library
    return btoa(unescape(encodeURIComponent(compressed)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  // Load PlantUML diagram
  useEffect(() => {
    const loadDiagram = async () => {
      if (!code) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')
        
        const cleanedCode = cleanCode(code)
        const diagramUrl = generatePlantUMLUrl(cleanedCode)
        
        // Test if the image loads successfully
        const testImg = new Image()
        testImg.onload = () => {
          setImageUrl(diagramUrl)
          setLoading(false)
        }
        testImg.onerror = () => {
          throw new Error('Failed to load diagram from PlantUML server')
        }
        testImg.src = diagramUrl

      } catch (err) {
        console.error('PlantUML rendering error:', err)
        setError(err instanceof Error ? err.message : 'Failed to render PlantUML diagram')
        setLoading(false)
        setFallbackMode(true)
      }
    }

    loadDiagram()
  }, [code, format, serverUrl])

  // Handle image load error
  const handleImageError = () => {
    setError('Failed to load PlantUML diagram')
    setLoading(false)
    setFallbackMode(true)
  }

  // Render fallback content
  const renderFallback = () => (
    <div className={`border border-gray-200 rounded-lg p-4 bg-gray-50 ${className}`}>
      <div className="flex items-center mb-2">
        <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
        <span className="text-sm font-medium text-gray-700">PlantUML Diagram</span>
      </div>
      <div className="bg-white border rounded p-3 mb-3">
        <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
          {cleanCode(code)}
        </pre>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Diagram could not be rendered</span>
        <a
          href={`https://www.plantuml.com/plantuml/uml/${encodePlantUML(cleanCode(code))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          View on PlantUML.com
          <ExternalLink className="h-3 w-3 ml-1" />
        </a>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 border border-gray-200 rounded-lg bg-gray-50 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Rendering PlantUML diagram...</span>
      </div>
    )
  }

  if (error && fallbackMode) {
    return renderFallback()
  }

  if (!imageUrl) {
    return (
      <div className={`border border-gray-200 rounded-lg p-4 bg-gray-50 ${className}`}>
        <div className="flex items-center mb-2">
          <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
          <span className="text-sm font-medium text-gray-700">PlantUML Diagram</span>
        </div>
        <p className="text-sm text-gray-600">No valid PlantUML code found</p>
      </div>
    )
  }

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">PlantUML Diagram</span>
          <a
            href={`https://www.plantuml.com/plantuml/uml/${encodePlantUML(cleanCode(code))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-xs text-blue-600 hover:text-blue-800"
          >
            Open in PlantUML
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </div>
      </div>
      <div className="p-4 bg-white">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="PlantUML Diagram"
          className="max-w-full h-auto mx-auto"
          onError={handleImageError}
          style={{ maxHeight: '600px' }}
        />
      </div>
    </div>
  )
}
