# Task Management API - Rust Rocket Backend

A RESTful API built with Rust and Rocket framework for managing tasks.

## Features

- Create, read, update, and delete tasks
- Task properties: title, description, type, start/end times, due date, completion status, urgency, color
- CORS enabled for frontend integration
- JSON API responses
- UUID-based task identification

## API Endpoints

### Base URL: `http://localhost:8000`

### Tasks

- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/{id}` - Get a specific task by ID
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/{id}` - Update an existing task
- `DELETE /api/tasks/{id}` - Delete a task

### Task Model

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string?",
  "task_type": "string",
  "start_time": "datetime?",
  "end_time": "datetime?",
  "due_date": "datetime?",
  "is_completed": "boolean",
  "is_urgent": "boolean",
  "color": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

## Development

### Prerequisites

- Rust (latest stable version)
- Cargo

### Running the API

```bash
# Install dependencies and run
cargo run

# For development with auto-reload
cargo watch -x run
```

The API will be available at `http://localhost:8000`

### Building for Production

```bash
cargo build --release
```

## Dependencies

- **rocket**: Web framework
- **serde**: Serialization/deserialization
- **chrono**: Date and time handling
- **uuid**: UUID generation
- **rocket_cors**: CORS support
- **tokio**: Async runtime
