using Microsoft.EntityFrameworkCore;
using TaskManagement.Core.Data;
using TaskManagement.Core.Models.Tasks;
using TaskManagement.Core.Repositories;
using TaskManagement.Core.Services;
using TaskManagement.Core.Validations;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<TaskDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<ITaskCategorizationService, KeywordTaskCategorizationService>();
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<IValidator<CreateTaskDto>, CreateTaskValidator>();
builder.Services.AddScoped<IValidator<UpdateTaskDto>, UpdateTaskValidator>();
builder.Services.AddScoped<IValidator<TaskItem>, TaskEntityValidator>();
builder.Services.AddScoped<ITaskService, TaskService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS for Angular
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalhost", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    // Always apply migrations with retry logic
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<TaskDbContext>();
        var maxRetries = 10;
        var delay = TimeSpan.FromSeconds(5);

        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                Console.WriteLine($"Attempting to connect to database (Attempt {i + 1}/{maxRetries})...");
                // First ensure database exists
                db.Database.EnsureCreated();
                // Then apply any pending migrations
                db.Database.Migrate();
                Console.WriteLine("Database connection successful! Migrations applied.");
                break;
            }
            catch (Exception ex)
            {
                if (i == maxRetries - 1)
                {
                    Console.WriteLine($"Failed to connect to the database after {maxRetries} attempts.");
                    Console.WriteLine($"Error: {ex.Message}");
                    throw;
                }

                Console.WriteLine($"Database connection failed. Retrying in {delay.TotalSeconds} seconds...");
                Thread.Sleep(delay);
            }
        }
    }
}

// Only use HTTPS redirection when not running in Docker
if (Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") != "true")
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowLocalhost");
app.UseAuthorization();
app.MapControllers();

app.Run();
