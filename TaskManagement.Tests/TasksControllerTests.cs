using TaskManagement.API.Controllers;
using TaskManagement.API.Data;

namespace TaskManagement.Tests;

public class TasksControllerTests
{
    private readonly Mock<ITaskCategorizationService> _mockCategorizationService;
    private readonly DbContextOptions<TaskDbContext> _dbContextOptions;

    public TasksControllerTests()
    {
        _mockCategorizationService = new Mock<ITaskCategorizationService>();

        // Setup in-memory database for testing
        _dbContextOptions = new DbContextOptionsBuilder<TaskDbContext>()
            .UseInMemoryDatabase(databaseName: "TaskManagerTests_" + Guid.NewGuid().ToString())
            .Options;
    }

    [Fact]
    public async Task GetTasks_ShouldReturnAllTasks()
    {
        // Arrange
        using var context = new TaskDbContext(_dbContextOptions);
        await SeedTestData(context);

        var controller = new TasksController(context, _mockCategorizationService.Object);

        // Act
        var result = await controller.GetTasks();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var tasks = Assert.IsAssignableFrom<IEnumerable<TaskDto>>(okResult.Value);
        Assert.Equal(2, tasks.Count());
    }

    [Fact]
    public async Task GetTask_WithValidId_ShouldReturnTask()
    {
        // Arrange
        using var context = new TaskDbContext(_dbContextOptions);
        await SeedTestData(context);

        var controller = new TasksController(context, _mockCategorizationService.Object);

        // Act
        var result = await controller.GetTask(1);

        // Assert
        var taskDto = Assert.IsType<TaskDto>(result.Value);
        Assert.Equal("Test Task 1", taskDto.Title);
    }

    [Fact]
    public async Task CreateTask_ShouldAddTaskAndReturnNewTask()
    {
        // Arrange
        using var context = new TaskDbContext(_dbContextOptions);

        _mockCategorizationService
            .Setup(s => s.CategorizeTask(It.IsAny<string>(), It.IsAny<string>()))
            .Returns("Work");

        var controller = new TasksController(context, _mockCategorizationService.Object);

        var newTask = new CreateTaskDto
        {
            Title = "New Task",
            Description = "New Task Description",
            Priority = Priority.High
        };

        // Act
        var result = await controller.CreateTask(newTask);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var taskDto = Assert.IsType<TaskDto>(createdResult.Value);
        Assert.Equal("New Task", taskDto.Title);
        Assert.Equal("Work", taskDto.Category);

        // Verify task was added to DB
        Assert.Equal(1, context.Tasks.Count());
    }

    private async Task SeedTestData(TaskDbContext context)
    {
        context.Tasks.AddRange(
            new Core.Models.Task
            {
                Id = 1,
                Title = "Test Task 1",
                Description = "Test Description 1",
                Priority = Priority.High,
                Category = "Work",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new Core.Models.Task
            {
                Id = 2,
                Title = "Test Task 2",
                Description = "Test Description 2",
                Priority = Priority.Low,
                Category = "Personal",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        );

        await context.SaveChangesAsync();
    }
}
