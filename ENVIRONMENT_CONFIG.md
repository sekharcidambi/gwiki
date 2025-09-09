# Environment Configuration

## Backend URL Configuration

The frontend connects to the ADocS FastAPI backend service. You can configure the backend URL using environment variables.

### Environment Variable

- `ADOCS_API_BASE`: URL of the ADocS FastAPI service backend

### Default Values

If not specified, the frontend will default to:
```
ADOCS_API_BASE=http://127.0.0.1:8000
```

### Configuration Examples

#### Local Development
```bash
ADOCS_API_BASE=http://127.0.0.1:8000
```

#### Production
```bash
ADOCS_API_BASE=https://your-backend-domain.com
```

#### Docker Containers
```bash
ADOCS_API_BASE=http://backend:8000
```

### Setting Environment Variables

#### For Next.js Development
Create a `.env.local` file in the project root:
```bash
ADOCS_API_BASE=http://127.0.0.1:8000
```

#### For Production Deployment
Set the environment variable in your deployment environment:
```bash
export ADOCS_API_BASE=https://your-backend-domain.com
```

### API Endpoints

The frontend will automatically append the following endpoints to the base URL:
- `/api/repositories` - Get cached repositories
- `/api/documentation` - Get documentation
- `/api/analyze` - Analyze new repository (async)
- `/api/generate-wiki` - Generate wiki (async)
- `/health` - Health check
