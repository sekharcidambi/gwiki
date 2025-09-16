# Gloki - AI-Enhanced GitHub Repository Wikis

Gloki is a modern web application that instantly generates beautiful, AI-enhanced wikis from any GitHub repository. Powered by Claude AI, it provides intelligent content summarization, documentation enhancement, and key insights. Simply paste a repository URL and get comprehensive, enhanced documentation in seconds.

## Features

- 🤖 **AI Enhanced**: Powered by Claude AI for intelligent content analysis
- 📝 **Smart Summaries**: Automatic generation of concise summaries and key points
- 🔧 **Content Enhancement**: AI-improved documentation with better structure and clarity
- 🔍 **Smart Search**: Full-text search across all documentation with AI insights
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- 🎨 **Beautiful UI**: Modern, clean interface with syntax highlighting
- 📚 **Comprehensive**: Automatically discovers and organizes all documentation
- 🔗 **GitHub Integration**: Direct integration with GitHub API

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Markdown**: Marked.js with syntax highlighting
- **GitHub API**: Octokit.js
- **AI**: Anthropic Claude API (Sonnet 4 model)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd gwiki
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```env
# Optional: GitHub token for higher rate limits
GITHUB_TOKEN=your_github_token_here

# Required: Anthropic Claude API Key for AI features
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

- `GITHUB_TOKEN` (optional): GitHub personal access token for higher API rate limits
- `ANTHROPIC_API_KEY` (required): Anthropic Claude API key for AI features

## Usage

1. **Enter Repository URL**: Paste any public GitHub repository URL
2. **Generate Wiki**: Click "Generate Wiki" to analyze the repository
3. **Browse Documentation**: Navigate through the generated wiki pages
4. **Search**: Use the search bar to find specific content
5. **Share**: Share the wiki URL with your team

## How It Works

1. **Repository Analysis**: The app fetches repository metadata and structure
2. **Documentation Discovery**: Automatically finds README files, docs, and markdown files
3. **AI Enhancement**: Claude Sonnet 4 analyzes and enhances content with summaries and improvements
4. **Content Processing**: Converts markdown to HTML with syntax highlighting
5. **Wiki Generation**: Creates a navigable wiki with search functionality and AI insights

## API Endpoints

### POST /api/generate-wiki

Generates a wiki from a GitHub repository URL.

**Request Body:**
```json
{
  "repoUrl": "https://github.com/username/repository"
}
```

**Response:**
```json
{
  "repository": {
    "name": "repository-name",
    "description": "Repository description",
    "owner": "username",
    "stars": 1000,
    "language": "JavaScript",
    "topics": ["web", "documentation"],
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-12-01T00:00:00Z"
  },
  "pages": [
    {
      "title": "README",
      "content": "# Repository Title\n\nContent...",
      "path": "README.md",
      "type": "readme"
    }
  ],
  "structure": [
    {
      "title": "README",
      "path": "README.md"
    }
  ]
}
```

## Development

### Project Structure

```
gloki/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── MarkdownRenderer.tsx
│   ├── RepoInput.tsx
│   └── WikiGenerator.tsx
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Octokit](https://octokit.github.io/) for GitHub API integration
- [Marked](https://marked.js.org/) for markdown parsing
- [Lucide](https://lucide.dev/) for beautiful icons 
