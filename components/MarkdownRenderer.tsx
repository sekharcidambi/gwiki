'use client'

import { useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import PlantUMLRenderer from './PlantUMLRenderer'

interface MarkdownRendererProps {
  content: string
}

interface PlantUMLBlock {
  id: string
  code: string
  startIndex: number
  endIndex: number
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [renderedContent, setRenderedContent] = useState<JSX.Element[]>([])

  // Extract PlantUML code blocks from markdown content
  const extractPlantUMLBlocks = (markdown: string): PlantUMLBlock[] => {
    const plantUMLRegex = /```plantuml\s*\n([\s\S]*?)\n```/gi
    const blocks: PlantUMLBlock[] = []
    let match
    let blockIndex = 0

    while ((match = plantUMLRegex.exec(markdown)) !== null) {
      blocks.push({
        id: `plantuml-${blockIndex}`,
        code: match[1].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length
      })
      blockIndex++
    }

    return blocks
  }

  // Split content into parts and render accordingly
  const renderContent = (markdown: string) => {
    const plantUMLBlocks = extractPlantUMLBlocks(markdown)
    
    if (plantUMLBlocks.length === 0) {
      // No PlantUML blocks, render as regular markdown
      return (
        <div 
          className="markdown-content"
          dangerouslySetInnerHTML={{ 
            __html: marked(markdown, { breaks: true, gfm: true })
          }}
          style={{
            lineHeight: '1.6',
            color: '#374151',
          }}
        />
      )
    }

    // Split content around PlantUML blocks
    const parts: Array<{ type: 'markdown' | 'plantuml'; content: string; block?: PlantUMLBlock }> = []
    let lastIndex = 0

    plantUMLBlocks.forEach((block) => {
      // Add markdown content before this block
      if (block.startIndex > lastIndex) {
        const markdownContent = markdown.slice(lastIndex, block.startIndex).trim()
        if (markdownContent) {
          parts.push({ type: 'markdown', content: markdownContent })
        }
      }

      // Add PlantUML block
      parts.push({ type: 'plantuml', content: block.code, block })

      lastIndex = block.endIndex
    })

    // Add remaining markdown content
    if (lastIndex < markdown.length) {
      const markdownContent = markdown.slice(lastIndex).trim()
      if (markdownContent) {
        parts.push({ type: 'markdown', content: markdownContent })
      }
    }

    // Render parts
    return parts.map((part, index) => {
      if (part.type === 'plantuml' && part.block) {
        return (
          <PlantUMLRenderer
            key={part.block.id}
            code={part.content}
            className="my-6"
          />
        )
      } else {
        return (
          <div
            key={`markdown-${index}`}
            className="markdown-content"
            dangerouslySetInnerHTML={{ 
              __html: marked(part.content, { breaks: true, gfm: true })
            }}
            style={{
              lineHeight: '1.6',
              color: '#374151',
            }}
          />
        )
      }
    })
  }

  useEffect(() => {
    if (content) {
      const rendered = renderContent(content)
      setRenderedContent(Array.isArray(rendered) ? rendered : [rendered])
    }
  }, [content])

  return (
    <div className="markdown-content">
      {renderedContent}
    </div>
  )
} 