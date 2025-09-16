import { NextRequest, NextResponse } from 'next/server'

// Get users from environment variables
function getUsers() {
  const users = []
  
  // Admin user
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    users.push({
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD
    })
  }
  
  // Additional users from environment variables
  const user1Username = process.env.USER1_USERNAME
  const user1Password = process.env.USER1_PASSWORD
  if (user1Username && user1Password) {
    users.push({
      username: user1Username,
      password: user1Password
    })
  }
  
  const user2Username = process.env.USER2_USERNAME
  const user2Password = process.env.USER2_PASSWORD
  if (user2Username && user2Password) {
    users.push({
      username: user2Username,
      password: user2Password
    })
  }
  
  const user3Username = process.env.USER3_USERNAME
  const user3Password = process.env.USER3_PASSWORD
  if (user3Username && user3Password) {
    users.push({
      username: user3Username,
      password: user3Password
    })
  }
  
  return users
}

export async function POST(request: NextRequest) {
  try {
    // Check if authentication is enabled
    const authEnabled = process.env.AUTH_ENABLED === 'true'
    
    if (!authEnabled) {
      return NextResponse.json({
        success: true,
        user: {
          username: 'guest',
          isAuthenticated: true
        }
      })
    }

    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Get users from environment variables
    const users = getUsers()
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No users configured. Please check environment variables.' },
        { status: 500 }
      )
    }

    // Check if user exists and password matches
    const user = users.find(u => u.username === username && u.password === password)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      )
    }

    // In a real application, you would:
    // 1. Hash the password before storing
    // 2. Use JWT tokens or session management
    // 3. Store user data in a database
    // 4. Implement proper security measures

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        isAuthenticated: true
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
