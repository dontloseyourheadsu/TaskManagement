# Task Management Application

A modern task management web application built with Rust (Rocket), Angular, PostgreSQL, and Redis caching. This application showcases full-stack integration with modern technologies and high-performance caching.

## Features

- Create, read, update, and delete tasks with substeps
- Organize tasks by topics with color coding
- Set task types (work, personal, meeting, deadline, event)
- Mark tasks and substeps as completed
- Set urgency levels and due dates
- Filter tasks by date ranges
- High-performance Redis caching for tasks and substeps (30-second TTL)
- Responsive design for desktop and mobile usage

## Technology Stack

### Backend

- **Rust** with Rocket web framework
- **PostgreSQL** database with UUID primary keys
- **Redis** caching with connection pooling (mobc)
- **Serde** for JSON serialization
- **Tokio** async runtime
- RESTful API design

### Frontend

- **Angular** (modern version)
- **TypeScript**
- **Bootstrap** styling
- Modern component-based architecture

### Caching

- **Redis** 7-alpine in Docker
- **Connection pooling** with mobc/mobc-redis
- **30-second TTL** for tasks and substeps
- **Automatic cache invalidation** on mutations
- **User-scoped cache keys** for security

### DevOps

- **Docker** for containerization
- **PostgreSQL** in Docker
- **Redis** in Docker

## Project Structure

- **TaskManagement.Api/** - Rust REST API with Rocket
  - `src/main.rs` - Application entry point
  - `src/config.rs` - Configuration with Redis settings
  - `src/cache.rs` - Redis caching abstraction
  - `src/database/` - Database operations with caching integration
  - `src/routes/` - API route handlers
- **TaskManagement.Web/** - Angular frontend
  - Modern Angular application with TypeScript
  - Component-based architecture
  - Responsive UI design

## Running the Application

### Prerequisites

- Docker and Docker Compose
- Rust (latest stable version)
- Node.js and npm (for Angular frontend)

### Using Docker (Recommended for Databases)

1. Start the required services (PostgreSQL and Redis):

```bash
docker-compose up -d
```

This will start:

- PostgreSQL on port 5432
- Redis on port 6379

### Running the Backend (Rust API)

1. Navigate to the API directory:

```bash
cd TaskManagement.Api
```

2. Set environment variables (optional, defaults provided):

```bash
export DATABASE_URL="postgresql://postgres:password@localhost:5432/taskmanagement"
export REDIS_URL="redis://127.0.0.1:6379"
export CACHE_TTL_SECONDS="30"
```

3. Run the Rust backend:

```bash
cargo run
```

The API will be available at: http://localhost:8000

### Running the Frontend (Angular)

1. Navigate to the web directory:

```bash
cd TaskManagement.Web
```

2. Install dependencies:

```bash
npm install
```

3. Start the Angular development server:

```bash
npm start
```

The web application will be available at: http://localhost:4200

## Caching Architecture

The application implements a sophisticated Redis caching layer:

### Cache Strategy

- **Cache-first reads**: Check Redis before hitting the database
- **Write-through invalidation**: Clear cache on mutations
- **30-second TTL**: Automatic cache expiration
- **User-scoped keys**: Cache isolation per user

### Cached Operations

- **Tasks**: `get_tasks_by_user` with optional date filtering
- **Substeps**: `get_substeps_by_task` for task details

### Cache Keys

- Tasks: `tasks:user:{user_id}` or `tasks:user:{user_id}:date:{date}`
- Substeps: `substeps:task:{task_id}`

### Connection Pooling

- Maximum 20 open connections
- 8 idle connections maintained
- Automatic connection management with mobc

## API Endpoints

### Tasks

- `GET /tasks/{user_id}` - Get all tasks for a user (cached)
- `GET /tasks/{user_id}/{date}` - Get tasks for a specific date (cached)
- `POST /tasks` - Create a new task (invalidates cache)

### Topics

- `GET /topics/{user_id}` - Get all topics for a user
- `POST /topics` - Create a new topic

### Substeps

- `GET /substeps/{task_id}` - Get all substeps for a task (cached)
- `POST /substeps` - Create a new substep (invalidates cache)

### Users

- `POST /users` - Create a new user
- User authentication endpoints

## Database Schema

The application uses PostgreSQL with the following main tables:

- **users** - User accounts with UUID primary keys
- **topics** - Task organization categories with colors
- **tasks** - Main task entities with type enum, urgency, completion status
- **task_substeps** - Subtasks within main tasks

Key features:

- UUID primary keys for all entities
- Foreign key constraints with cascade deletes
- Indexes for performance optimization
- Task type enum: work, personal, meeting, deadline, event

## Performance Features

### Redis Caching

- **30-second TTL** on frequently accessed data
- **Connection pooling** for optimal Redis performance
- **Automatic invalidation** when data changes
- **User isolation** prevents cache leaks between users

### Database Optimization

- **Indexed queries** for fast lookups
- **Efficient foreign key relationships**
- **Optimized query patterns** in Rust code

## Configuration

The application can be configured via environment variables:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/taskmanagement

# Redis Cache
REDIS_URL=redis://127.0.0.1:6379
CACHE_TTL_SECONDS=30

# Rocket Server
ROCKET_ADDRESS=127.0.0.1
ROCKET_PORT=8000
```

## Development

### Backend Development (Rust)

The Rust backend uses:

- **Cargo** for dependency management
- **Rocket** for the web framework
- **Tokio** for async operations
- **Serde** for JSON handling

Key development commands:

```bash
# Build the project
cargo build

# Run with auto-reload
cargo watch -x run

# Run tests
cargo test

# Check code quality
cargo clippy
```

### Frontend Development (Angular)

Standard Angular development workflow:

```bash
# Install dependencies
npm install

# Development server with hot reload
ng serve

# Build for production
ng build

# Run tests
ng test
```

## Troubleshooting

### Database Issues

- Ensure PostgreSQL container is running: `docker ps`
- Check connection string in environment variables
- Verify database exists and schema is applied

### Redis Cache Issues

- Ensure Redis container is running: `docker ps | grep redis`
- Test Redis connection: `redis-cli ping`
- Check Redis URL in configuration

### API Issues

- Check Rust compilation: `cargo check`
- Verify port 8000 is available
- Review Rocket configuration in `Rocket.toml`

### Frontend Issues

- Ensure API is running and accessible
- Check Angular CLI version compatibility
- Verify proxy configuration for API calls

## License

MIT
