# Task Management Application

A simple task management web application built with .NET 9, Entity Framework Core, Angular, and Bootstrap. This application showcases full-stack integration with modern technologies.

## Features

- Create, read, update, and delete tasks
- Prioritize tasks (High, Medium, Low)
- Set due dates for tasks
- Mark tasks as completed
- Filter tasks by category and priority
- Search tasks by title or description
- AI-powered automatic categorization of tasks
- Responsive design for desktop and mobile usage

## Technology Stack

### Backend

- .NET 9 Web API
- Entity Framework Core (Code First approach)
- SQL Server
- Dependency Injection
- RESTful API design
- Repository pattern

### Frontend

- ASP.NET Core 9 MVC/Razor Pages
- AngularJS (1.x)
- Bootstrap 5
- Modern responsive UI

### DevOps

- Docker for containerization
- Entity Framework migrations
- MSSQL Server in Docker

## Project Structure

- **TaskManagement.API** - REST API for task management
- **TaskManagement.Core** - Core domain models and services
- **TaskManagement.Web** - Web frontend with Angular integration
- **TaskManagement.Tests.Unit** - Unit tests
- **TaskManagement.Tests.Integration** - Integration tests

## Running the Application

### Using Docker (Recommended)

1. Make sure Docker and Docker Compose are installed
2. Clone the repository
3. Run the start script:

```bash
./start.sh
```

4. Access the application:
   - Web UI: http://localhost:5002
   - API: https://localhost:7001

### Running Locally

1. Make sure .NET 9 SDK is installed
2. Clone the repository
3. Start SQL Server (or use Docker for the database):

```bash
docker-compose up -d sqlserver
```

4. Run the API:

```bash
cd TaskManagement.API
dotnet run
```

5. In a separate terminal, run the Web application:

```bash
cd TaskManagement.Web
dotnet run
```

6. Access the application:
   - Web UI: https://localhost:7217
   - API: https://localhost:7001
   - Swagger UI: https://localhost:7001/swagger

## AI Implementation

The application includes an AI-powered feature that automatically categorizes tasks based on their title and description. This is implemented using the `KeywordTaskCategorizationService` that analyzes text to assign tasks to appropriate categories:

- **Work**: Tasks related to professional activities, meetings, projects, deadlines, etc.
- **Personal**: Tasks related to personal life, errands, hobbies, family, etc.
- **Health**: Tasks related to health and wellness, exercise, medical appointments, etc.
- **Education**: Tasks related to learning, courses, studying, research, etc.
- **Finance**: Tasks related to financial matters, budgeting, bills, investments, etc.

### How It Works

1. When a task is created or updated, the `TaskService` passes the task details to the `ITaskCategorizationService`
2. The service analyzes the title and description text using keyword matching algorithms
3. Based on the detected keywords, it assigns the most relevant category
4. The category is saved with the task and displayed in the UI

### Implementation Details

The current implementation uses a simple keyword-based approach in `KeywordTaskCategorizationService.cs`, but the architecture is designed to be easily extended with more sophisticated AI methods:

```csharp
// Sample from KeywordTaskCategorizationService
public string CategorizeTask(string title, string description)
{
    var combinedText = $"{title} {description}".ToLower();

    // Check for each category based on keywords
    if (WorkKeywords.Any(keyword => combinedText.Contains(keyword)))
        return "Work";

    if (HealthKeywords.Any(keyword => combinedText.Contains(keyword)))
        return "Health";

    // ... other categories

    return "Personal"; // Default category
}
```

### Future AI Enhancements

The system is designed to be easily upgraded to more advanced AI services:

1. **Integration with Azure Text Analytics**: Replace the keyword service with Azure's Text Analytics API for more accurate classification
2. **Machine Learning Model**: Train a custom ML.NET model on task data for better categorization
3. **User Feedback Loop**: Implement a system where users can correct categories to improve the AI over time

## API Endpoints

- `GET /api/tasks`: Get all tasks
- `GET /api/tasks/{id}`: Get a specific task
- `POST /api/tasks`: Create a new task
- `PUT /api/tasks/{id}`: Update a task
- `DELETE /api/tasks/{id}`: Delete a task
- `PATCH /api/tasks/{id}/complete`: Mark a task as completed

## Testing

The project includes both unit and integration tests:

- **Unit Tests**: Test individual components like services, validators, and controllers in isolation

  - Uses xUnit for test framework
  - NSubstitute for mocking dependencies
  - FluentAssertions for readable assertions

- **Integration Tests**: Test the full API and database interactions
  - Uses a dockerized SQL Server instance for realistic database testing
  - Tests the full request/response cycle

Run tests with:

```bash
dotnet test
```

## Troubleshooting

If you encounter any issues with the application:

1. **Database Connection Issues**:

   - Check that the SQL Server container is running with `docker ps`
   - Verify the connection string in `appsettings.json`
   - Restart the SQL Server container with `docker compose restart sqlserver`

2. **API Issues**:

   - Verify the API is running by accessing the Swagger UI at https://localhost:7001/swagger
   - Check API logs for detailed error information

3. **Web Application Issues**:
   - Ensure the API URL is correctly set in `TaskManagement.Web/appsettings.json`
   - Check the browser console for JavaScript errors

## License

MIT
