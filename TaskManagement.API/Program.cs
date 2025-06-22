using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using TaskManagement.Core.Data;
using TaskManagement.Core.Models.Tasks;
using TaskManagement.Core.Repositories;
using TaskManagement.Core.Services;
using TaskManagement.Core.Validations;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<TaskDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});

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
        policy.WithOrigins("http://localhost:5002", "https://localhost:7002")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Allow credentials (cookies, auth headers)
    });
});

var app = builder.Build();

// Apply database migrations at startup (in dev or prod)

app.UseSwagger();
app.UseSwaggerUI();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TaskDbContext>();
    var maxRetries = 10;
    var delay = TimeSpan.FromSeconds(5);

    for (int i = 0; i < maxRetries; i++)
    {
        try
        {
            Console.WriteLine($"Attempting to apply migrations (Attempt {i + 1}/{maxRetries})...");
            db.Database.Migrate();
            Console.WriteLine("Database migration successful.");
            break;
        }
        catch (Exception ex)
        {
            if (i == maxRetries - 1)
            {
                Console.WriteLine("Final attempt to apply migrations failed.");
                Console.WriteLine($"Error: {ex.Message}");
                throw;
            }

            Console.WriteLine($"Migration failed. Retrying in {delay.TotalSeconds} seconds...");
            Thread.Sleep(delay);
        }
    }
}

app.UseHttpsRedirection();

app.UseRouting();
app.UseCors("AllowLocalhost");
app.UseAuthorization();
app.MapControllers();

app.Run();
