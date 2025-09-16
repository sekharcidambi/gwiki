'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  username: string
  isAuthenticated: boolean
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if authentication is enabled
    const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'
    
    if (!authEnabled) {
      // If auth is disabled, set a default authenticated user
      setUser({ username: 'guest', isAuthenticated: true })
      setIsLoading(false)
      return
    }

    // Check if user is already logged in (check localStorage)
    const savedUser = localStorage.getItem('gloki_user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
      } catch (error) {
        localStorage.removeItem('gloki_user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    // Check if authentication is enabled
    const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'
    
    if (!authEnabled) {
      // If auth is disabled, just set the user as authenticated
      const userData = { username: 'guest', isAuthenticated: true }
      setUser(userData)
      return true
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const userData = { username, isAuthenticated: true }
        setUser(userData)
        localStorage.setItem('gloki_user', JSON.stringify(userData))
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('gloki_user')
    // Call logout API to clear server-side session if needed
    fetch('/api/auth/logout', { method: 'POST' })
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
