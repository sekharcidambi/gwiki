# Authentication Setup for Gloki

This document describes the basic authentication system implemented for the Gloki home page.

## Features

- **Simple Username/Password Authentication**: Basic form-based login
- **Session Management**: Uses localStorage for client-side session persistence
- **Demo Credentials**: Pre-configured test accounts for easy access
- **Responsive Design**: Mobile-friendly login form
- **Security Features**: Password visibility toggle, form validation

## User Configuration

Users are configured via environment variables. By default, the following accounts are available:

| Username | Password | Environment Variable | Description |
|----------|----------|---------------------|-------------|
| `admin` | `admin123` | `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Administrator account (required) |
| `user` | `password123` | `USER1_USERNAME` / `USER1_PASSWORD` | Regular user account (optional) |
| `gloki` | `gloki2024` | `USER2_USERNAME` / `USER2_PASSWORD` | Gloki-specific account (optional) |

### Adding/Modifying Users

To add or modify users, update your `.env.local` file:

```bash
# Required admin user
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Optional additional users
USER1_USERNAME=user
USER1_PASSWORD=password123

USER2_USERNAME=gloki
USER2_PASSWORD=gloki2024

# Add more users by uncommenting and setting values
USER3_USERNAME=newuser
USER3_PASSWORD=newpassword
```

## Implementation Details

### Components

1. **AuthProvider** (`lib/auth.tsx`): React context for authentication state management
2. **LoginForm** (`components/LoginForm.tsx`): Login form component with validation
3. **API Routes**:
   - `app/api/auth/login/route.ts`: Login endpoint
   - `app/api/auth/logout/route.ts`: Logout endpoint

### Security Notes

⚠️ **This is a basic implementation for demonstration purposes. For production use:**

1. **Hash Passwords**: Use bcrypt or similar to hash passwords before storage
2. **Use JWT Tokens**: Implement proper JWT token-based authentication
3. **Database Storage**: Store user credentials in a secure database
4. **Session Management**: Implement server-side session management
5. **Rate Limiting**: Add rate limiting to prevent brute force attacks
6. **HTTPS**: Ensure all authentication happens over HTTPS
7. **Environment Variables**: Move sensitive data to environment variables

### Environment Variables

Copy `env.example` to `.env.local` and configure:

```bash
# Authentication Configuration
AUTH_ENABLED=true
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SESSION_SECRET=your-secret-key-here
```

## Usage

1. **Start the application**: `npm run dev`
2. **Navigate to the home page**: The login form will be displayed
3. **Enter credentials**: Use any of the demo credentials above
4. **Access the application**: Once authenticated, you'll see the main Gloki interface
5. **Logout**: Click the logout button in the header

## File Structure

```
gwiki/
├── lib/
│   └── auth.tsx                 # Authentication context and hooks
├── components/
│   └── LoginForm.tsx           # Login form component
├── app/
│   ├── api/auth/
│   │   ├── login/route.ts      # Login API endpoint
│   │   └── logout/route.ts     # Logout API endpoint
│   ├── layout.tsx              # Root layout with AuthProvider
│   └── page.tsx                # Main page with auth integration
└── AUTHENTICATION.md           # This file
```

## Customization

### Adding New Users

Add new users by setting environment variables in your `.env.local` file:

```bash
# Add a new user (USER3 is available by default)
USER3_USERNAME=newuser
USER3_PASSWORD=newpassword

# For more users, you can extend the getUsers() function in the API route
# to support USER4, USER5, etc.
```

### Styling

The login form uses Tailwind CSS classes. Customize the appearance by modifying `components/LoginForm.tsx`.

### Authentication Flow

1. User visits the home page
2. If not authenticated, login form is displayed
3. User enters credentials and submits form
4. Credentials are validated against the users array
5. If valid, user is logged in and redirected to main interface
6. If invalid, error message is displayed
7. User can logout using the logout button in the header

## Troubleshooting

### Common Issues

1. **Login not working**: Check browser console for errors
2. **Credentials not accepted**: Verify username/password spelling
3. **Session not persisting**: Check localStorage in browser dev tools
4. **Styling issues**: Ensure Tailwind CSS is properly configured

### Development

- Authentication state is managed in React context
- Session persistence uses localStorage
- API routes handle server-side validation
- Form validation provides user feedback
