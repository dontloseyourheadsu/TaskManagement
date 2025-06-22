using System;
using System.Net.Http;
using System.Threading.Tasks;
using System.IO;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Configurations;
using DotNet.Testcontainers.Containers;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using TaskManagement.API;
using TaskManagement.Core.Data;
using TaskManagement.Core.Models.Tasks;
using TaskManagement.Core.Repositories;
using TaskManagement.Core.Services;
using TaskManagement.Core.Validations;
using Testcontainers.MsSql;
using Xunit;

namespace TaskManagement.Tests.Integration.Setup
{
    public class IntegrationTestFixture : IAsyncLifetime
    {
        private readonly MsSqlContainer _sqlContainer;
        public HttpClient Client { get; private set; } = null!;
        public IServiceProvider ServiceProvider { get; private set; } = null!;
        public string ConnectionString { get; private set; } = null!;
        public IConfiguration Configuration { get; private set; }

        public IntegrationTestFixture()
        {
            // Load configuration from appsettings.test.json
            Configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.test.json", optional: false)
                .Build();

            var dbSettings = Configuration.GetSection("DatabaseSettings");
            
            _sqlContainer = new MsSqlBuilder()
                .WithImage(dbSettings["SqlServerImage"])
                .WithPassword(dbSettings["SqlServerPassword"])
                .WithAutoRemove(true)
                .WithCleanUp(true)
                .Build();
        }

        public async Task InitializeAsync()
        {
            try
            {
                // Start the SQL Server container
                await _sqlContainer.StartAsync();

                // Create a unique database name for this test run to avoid conflicts
                var databaseName = $"TaskManagement_Test_{Guid.NewGuid().ToString("N")}";

                // Get connection string to server, not to a specific database
                var serverConnectionString = _sqlContainer.GetConnectionString();

                // Use the Master database initially
                var connectionTimeout = Configuration.GetSection("DatabaseSettings")["ConnectionTimeout"] ?? "120";
                ConnectionString = serverConnectionString + ";Database=" + databaseName + ";TrustServerCertificate=True;Connection Timeout=" + connectionTimeout;

                Console.WriteLine($"Using connection string: {ConnectionString}");

                // Build test server and client
                var hostBuilder = new HostBuilder()
                    .ConfigureWebHost(webHost =>
                    {
                        webHost.UseTestServer();
                        webHost.UseStartup<TestStartup>();
                        webHost.ConfigureAppConfiguration(config =>
                        {
                            // Start with all the settings from appsettings.test.json
                            config.AddJsonFile("appsettings.test.json", optional: false);
                            
                            // Override with dynamic connection string
                            config.AddInMemoryCollection(new List<KeyValuePair<string, string?>>
                            {
                                new KeyValuePair<string, string?>("ConnectionStrings:DefaultConnection", ConnectionString)
                            });
                        });
                    });

                var host = await hostBuilder.StartAsync();
                Client = host.GetTestClient();
                ServiceProvider = host.Services;

                // Initialize the database
                using var scope = ServiceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<TaskDbContext>();

                // Ensure database is created with schema
                await dbContext.Database.EnsureCreatedAsync();

                Console.WriteLine("Database initialized successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error initializing database: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner exception: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        public async Task DisposeAsync()
        {
            await _sqlContainer.StopAsync();
        }

        // Add a method to clear database between tests
        public async Task ClearDatabaseAsync()
        {
            using var scope = ServiceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<TaskDbContext>();

            // Clear all tasks
            dbContext.Tasks.RemoveRange(dbContext.Tasks);
            await dbContext.SaveChangesAsync();

            Console.WriteLine("Database cleared for next test");
        }
    }

    // Custom startup that uses the test container for the database
    public class TestStartup
    {
        private readonly IConfiguration _configuration;

        public TestStartup(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public void ConfigureServices(IServiceCollection services)
        {
            // Add configuration to services
            services.AddSingleton(_configuration);
            
            // Configure the database using connection string from configuration
            services.AddDbContext<TaskDbContext>(options =>
                options.UseSqlServer(_configuration.GetConnectionString("DefaultConnection")));

            // Register all the services as they are in the real app
            services.AddScoped<ITaskCategorizationService, KeywordTaskCategorizationService>();
            services.AddScoped<ITaskRepository, TaskRepository>();
            services.AddScoped<IValidator<CreateTaskDto>, CreateTaskValidator>();
            services.AddScoped<IValidator<UpdateTaskDto>, UpdateTaskValidator>();
            services.AddScoped<IValidator<TaskItem>, TaskEntityValidator>();
            services.AddScoped<ITaskService, TaskService>();

            // Add API controllers with JSON options and make sure to scan the TaskManagement.API assembly
            services.AddControllers()
                .AddApplicationPart(typeof(TaskManagement.API.Controllers.TasksController).Assembly)
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = null;
                    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
                });

            services.AddEndpointsApiExplorer();
            services.AddProblemDetails();
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            app.UseExceptionHandler();
            app.UseStatusCodePages();

            app.UseRouting();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
