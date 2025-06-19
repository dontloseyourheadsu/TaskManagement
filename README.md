# Task Management Application

A simple task management web application built with .NET 9, Entity Framework Core, Angular, and jQuery. This application showcases full-stack integration with modern technologies.

## Features

- Create, read, update, and delete tasks
- Prioritize tasks (High, Medium, Low)
- Set due dates for tasks
- Mark tasks as completed
- Filter tasks by category
- Search tasks by title or description
- AI-powered automatic categorization of tasks

## Technology Stack

### Backend

- .NET 9 Web API
- Entity Framework Core (Code First approach)
- MS SQL Server (running in Docker)
- Dependency Injection
- RESTful API design

### Frontend

- ASP.NET MVC with Razor views
- Angular 15+ for the task management interface
- jQuery for quick interactive features
- Bootstrap 5 for responsive layout

### Testing

- xUnit for unit tests
- Moq for mocking
- In-memory database for controller tests

### DevOps

- Docker support for SQL Server database
- Entity Framework migrations

## AI Implementation

The application includes an AI-powered feature that automatically categorizes tasks based on their description. This is implemented as a keyword-based categorization service that analyzes the title and description of tasks to assign them to appropriate categories:

- **Work**: Identifies tasks related to professional activities
- **Personal**: Identifies tasks related to personal life and errands
- **Health**: Identifies tasks related to health and wellness
- **Education**: Identifies tasks related to learning and educational activities
- **Finance**: Identifies tasks related to financial matters

The implementation can be easily extended to integrate with an actual AI service (e.g., Azure Text Analytics) in the future.

## Setup Instructions

### Prerequisites

- .NET 9 SDK
- Docker
- Node.js and npm (for Angular development)

### Setup Instructions

#### One-Click Setup (Using Docker)

1. Make the startup script executable:

   ```bash
   chmod +x start.sh
   ```

2. Run the script to start the entire application:

   ```bash
   ./start.sh
   ```

   This single script will:

   - Build and start all components (SQL Server, API, and Web) using Docker
   - Wait for each service to be ready
   - Provide you with access URLs

3. Access the application:

   - Web UI: http://localhost:5000
   - API Swagger: http://localhost:5001/swagger

4. To stop all services, run:

   ```bash
   docker compose down
   ```

#### Manual Setup (Without Docker)

If you prefer to run the components without Docker, follow these steps:

1. Start SQL Server (Docker-based or local installation required)

2. Set up the API:

   ```bash
   cd TaskManagement.API
   dotnet build
   dotnet run
   ```

   The API will be available at https://localhost:7001/swagger

3. Set up the Web application:

   ```bash
   cd TaskManagement.Web
   dotnet build
   cd ClientApp
   npm install
   npm run build
   cd ..
   dotnet run
   ```

   The Web UI will be available at https://localhost:7000

### Troubleshooting

If you encounter any issues with the application:

1. **Database Connection Issues**:

   - Check that the SQL Server container is running with `docker ps`
   - Verify the connection string in `TaskManagement.API/appsettings.json`
   - If needed, restart the SQL Server container with `docker compose restart sqlserver`

2. **API Issues**:

   - Check the API logs for any errors
   - Verify that the API is running by accessing the Swagger UI at https://localhost:7001/swagger
   - Make sure migrations have been applied successfully

3. **Web Application Issues**:

   - Check that the API URL is correctly set in `TaskManagement.Web/appsettings.json`
   - Check the browser console for any JavaScript errors
   - Ensure all npm packages are installed by running `cd TaskManagement.Web/ClientApp && npm install`

4. **UI Rendering Issues**:
   - If the tasks are not visible, check that the Angular app is properly built
   - Navigate to the ClientApp directory and build the Angular app:
     ```bash
     cd TaskManagement.Web/ClientApp
     npm install
     npm run build
     ```

### Running Tests

```bash
cd TaskManagement.Tests
dotnet test
```

## Project Structure

- **TaskManagement.API**: Web API project with controllers and database context
- **TaskManagement.Core**: Shared models and services
- **TaskManagement.Web**: MVC application with Angular integration
- **TaskManagement.Tests**: Unit tests

## API Endpoints

- `GET /api/tasks`: Get all tasks
- `GET /api/tasks/{id}`: Get a specific task
- `POST /api/tasks`: Create a new task
- `PUT /api/tasks/{id}`: Update a task
- `DELETE /api/tasks/{id}`: Delete a task
- `PATCH /api/tasks/{id}/complete`: Mark a task as completed

## Frontend Architecture

The application uses a hybrid approach:

- ASP.NET MVC provides the main layout and infrastructure
- Angular components handle the task management functionality
- jQuery is used for some interactive features like quick refresh and task completion toggle

## License

MIT
