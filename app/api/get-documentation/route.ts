import { NextRequest, NextResponse } from 'next/server'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const repo = searchParams.get('repo')
    const section = searchParams.get('section')
    
    if (!repo) {
      return NextResponse.json({ error: 'Repository parameter is required' }, { status: 400 })
    }
    
    // Find the most recent documentation directory for this repository
    const docsBasePath = '/Users/sekharcidambi/adocs/generated_docs'
    const repoPath = join(docsBasePath, repo.replace('/', '_'))
    
    try {
      const entries = await readdir(repoPath)
      const timestampDirs = entries.filter(entry => /^\d{8}_\d{6}$/.test(entry))
      
      if (timestampDirs.length === 0) {
        return NextResponse.json({ error: 'No documentation found for this repository' }, { status: 404 })
      }
      
      // Get the most recent timestamp directory
      const latestDir = timestampDirs.sort().pop()
      const docPath = join(repoPath, latestDir!)
      
      if (section) {
        // Return specific section content
        const sectionFile = join(docPath, `${section}.md`)
        try {
          const content = await readFile(sectionFile, 'utf-8')
          return NextResponse.json({ 
            content,
            section,
            repository: repo,
            generated_at: latestDir
          })
        } catch (error) {
          return NextResponse.json({ error: 'Section not found' }, { status: 404 })
        }
      } else {
        // Return documentation structure and available sections
        const structureFile = join(docPath, 'documentation_structure.json')
        const metadataFile = join(docPath, 'repository_metadata.json')
        const indexFile = join(docPath, 'README.md')
        
        try {
          const [structure, metadata, index] = await Promise.all([
            readFile(structureFile, 'utf-8').then(JSON.parse),
            readFile(metadataFile, 'utf-8').then(JSON.parse),
            readFile(indexFile, 'utf-8')
          ])
          
          // Get list of available markdown files
          const entries = await readdir(docPath)
          const markdownFiles = entries
            .filter(entry => entry.endsWith('.md') && entry !== 'README.md')
            .map(entry => entry.replace('.md', ''))
          
          return NextResponse.json({
            repository: repo,
            generated_at: latestDir,
            structure,
            metadata,
            index,
            available_sections: markdownFiles
          })
        } catch (error) {
          return NextResponse.json({ error: 'Documentation files not found' }, { status: 404 })
        }
      }
      
    } catch (error) {
      return NextResponse.json({ error: 'Repository documentation not found' }, { status: 404 })
    }
    
  } catch (error) {
    console.error('Error fetching documentation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documentation' },
      { status: 500 }
    )
  }
}
