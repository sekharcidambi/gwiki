import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Glover Labs - Gloki',
  description: 'Generate beautiful wikis instantly from any GitHub repository',
  keywords: 'wiki, github, documentation, markdown, repository, glover labs',
  icons: {
    icon: '/glover-labs-logo.png',
    shortcut: '/glover-labs-logo.png',
    apple: '/glover-labs-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
} 