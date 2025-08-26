'use client'

import { useEffect, useRef } from 'react'
import { marked } from 'marked'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      // Configure marked options
      marked.setOptions({
        highlight: function (code, lang) {
          if (lang && SyntaxHighlighter.supportedLanguages.includes(lang)) {
            return SyntaxHighlighter.highlight(code, { language: lang, style: tomorrow })
          }
          return code
        },
        breaks: true,
        gfm: true,
      })

      // Render markdown
      contentRef.current.innerHTML = marked(content)
    }
  }, [content])

  return (
    <div 
      ref={contentRef}
      className="markdown-content"
      style={{
        lineHeight: '1.6',
        color: '#374151',
      }}
    />
  )
} 