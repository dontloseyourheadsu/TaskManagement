using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using NSubstitute;
using TaskManagement.Core.Common;
using TaskManagement.Core.Models.Tasks;
using TaskManagement.Core.Repositories;
using TaskManagement.Core.Services;
using TaskManagement.Core.Validations;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace TaskManagement.Tests.Unit.Services
{
    public class TaskServiceTests
    {
        private readonly ITaskRepository _taskRepository;
        private readonly ITaskCategorizationService _categorizationService;
        private readonly IValidator<CreateTaskDto> _createTaskValidator;
        private readonly IValidator<UpdateTaskDto> _updateTaskValidator;
        private readonly TaskService _taskService;

        public TaskServiceTests()
        {
            _taskRepository = Substitute.For<ITaskRepository>();
            _categorizationService = Substitute.For<ITaskCategorizationService>();
            _createTaskValidator = Substitute.For<IValidator<CreateTaskDto>>();
            _updateTaskValidator = Substitute.For<IValidator<UpdateTaskDto>>();

            _taskService = new TaskService(
                _taskRepository,
                _categorizationService,
                _createTaskValidator,
                _updateTaskValidator);
        }

        [Fact]
        public async Task CreateTaskAsync_WithValidDto_ShouldReturnSuccess()
        {
            // Arrange
            var createTaskDto = new CreateTaskDto
            {
                Title = "Test Task",
                Description = "Test Description",
                Priority = Priority.High,
                DueDate = DateTime.UtcNow.AddDays(1)
            };

            var expectedCategory = "Work";
            var expectedTaskId = 1;

            _createTaskValidator.Validate(createTaskDto).Returns(Result.Success());
            _categorizationService.CategorizeTask(createTaskDto.Title, createTaskDto.Description).Returns(expectedCategory);

            _taskRepository.CreateAsync(Arg.Any<TaskItem>()).Returns(callInfo =>
            {
                var task = callInfo.Arg<TaskItem>();
                task.Id = expectedTaskId; // Simulate auto-assigned ID
                return Result.Success(task);
            });

            // Act
            var result = await _taskService.CreateTaskAsync(createTaskDto);

            // Assert
            result.IsSuccess.Should().BeTrue();
            result.Value.Should().NotBeNull();
            result.Value.Id.Should().Be(expectedTaskId);
            result.Value.Title.Should().Be(createTaskDto.Title);
            result.Value.Description.Should().Be(createTaskDto.Description);
            result.Value.Priority.Should().Be(createTaskDto.Priority);
            result.Value.Category.Should().Be(expectedCategory);

            await _taskRepository.Received(1).CreateAsync(Arg.Any<TaskItem>());
        }

        [Fact]
        public async Task CreateTaskAsync_WithValidationFailure_ShouldReturnFailure()
        {
            // Arrange
            var createTaskDto = new CreateTaskDto
            {
                Title = "", // Invalid title
                Description = "Test Description"
            };

            var validationErrors = new[] { "Title is required" };
            _createTaskValidator.Validate(createTaskDto).Returns(Result.Failure(validationErrors));

            // Act
            var result = await _taskService.CreateTaskAsync(createTaskDto);

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.ErrorMessages.Should().Contain(validationErrors);
            await _taskRepository.DidNotReceive().CreateAsync(Arg.Any<TaskItem>());
        }

        [Fact]
        public async Task GetAllTasksAsync_ShouldReturnAllTasks()
        {
            // Arrange
            var tasks = new[]
            {
                new TaskItem { Id = 1, Title = "Task 1", Description = "Description 1" },
                new TaskItem { Id = 2, Title = "Task 2", Description = "Description 2" }
            };

            _taskRepository.GetAllAsync().Returns(Result.Success<IEnumerable<TaskItem>>(tasks));

            // Act
            var result = await _taskService.GetAllTasksAsync();

            // Assert
            result.IsSuccess.Should().BeTrue();
            result.Value.Should().HaveCount(2);
            result.Value.Should().Contain(dto => dto.Id == 1 && dto.Title == "Task 1");
            result.Value.Should().Contain(dto => dto.Id == 2 && dto.Title == "Task 2");
        }

        [Fact]
        public async Task GetTaskByIdAsync_WhenTaskExists_ShouldReturnTask()
        {
            // Arrange
            var taskId = 1;
            var task = new TaskItem
            {
                Id = taskId,
                Title = "Test Task",
                Description = "Test Description"
            };

            _taskRepository.GetByIdAsync(taskId).Returns(Result.Success(task));

            // Act
            var result = await _taskService.GetTaskByIdAsync(taskId);

            // Assert
            result.IsSuccess.Should().BeTrue();
            result.Value.Id.Should().Be(taskId);
            result.Value.Title.Should().Be(task.Title);
            result.Value.Description.Should().Be(task.Description);
        }

        [Fact]
        public async Task GetTaskByIdAsync_WhenTaskDoesNotExist_ShouldReturnFailure()
        {
            // Arrange
            var taskId = 999;
            _taskRepository.GetByIdAsync(taskId).Returns(Result.Failure<TaskItem>($"Task with ID {taskId} not found"));

            // Act
            var result = await _taskService.GetTaskByIdAsync(taskId);

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.ErrorMessages.Should().Contain(e => e.Contains(taskId.ToString()) && e.Contains("not found"));
        }

        [Fact]
        public async Task UpdateTaskAsync_WithValidData_ShouldUpdateTask()
        {
            // Arrange
            var taskId = 1;
            var existingTask = new TaskItem
            {
                Id = taskId,
                Title = "Original Title",
                Description = "Original Description",
                Priority = Priority.Low,
                Category = "Personal"
            };

            var updateDto = new UpdateTaskDto
            {
                Title = "Updated Title",
                Priority = Priority.High
            };

            _updateTaskValidator.Validate(updateDto).Returns(Result.Success());
            _taskRepository.GetByIdAsync(taskId).Returns(Result.Success(existingTask));
            _taskRepository.UpdateAsync(Arg.Any<TaskItem>()).Returns(Result.Success());

            _categorizationService
                .CategorizeTask("Updated Title", "Original Description")
                .Returns("Work"); // The category has changed

            // Act
            var result = await _taskService.UpdateTaskAsync(taskId, updateDto);

            // Assert
            result.IsSuccess.Should().BeTrue();

            await _taskRepository.Received(1).UpdateAsync(Arg.Is<TaskItem>(t =>
                t.Id == taskId &&
                t.Title == "Updated Title" &&
                t.Description == "Original Description" &&
                t.Priority == Priority.High &&
                t.Category == "Work"));
        }

        [Fact]
        public async Task UpdateTaskAsync_WithInvalidDto_ShouldReturnValidationError()
        {
            // Arrange
            var taskId = 1;
            var updateDto = new UpdateTaskDto
            {
                Title = new string('x', 201) // Too long
            };

            var validationErrors = new[] { "Title must not exceed 200 characters" };
            _updateTaskValidator.Validate(updateDto).Returns(Result.Failure(validationErrors));

            // Act
            var result = await _taskService.UpdateTaskAsync(taskId, updateDto);

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.ErrorMessages.Should().Contain(validationErrors);

            await _taskRepository.DidNotReceive().GetByIdAsync(Arg.Any<int>());
            await _taskRepository.DidNotReceive().UpdateAsync(Arg.Any<TaskItem>());
        }

        [Fact]
        public async Task CompleteTaskAsync_WhenTaskExists_ShouldMarkTaskAsCompleted()
        {
            // Arrange
            var taskId = 1;
            var existingTask = new TaskItem
            {
                Id = taskId,
                Title = "Test Task",
                IsCompleted = false
            };

            _taskRepository.GetByIdAsync(taskId).Returns(Result.Success(existingTask));
            _taskRepository.UpdateAsync(Arg.Any<TaskItem>()).Returns(Result.Success());

            // Act
            var result = await _taskService.CompleteTaskAsync(taskId);

            // Assert
            result.IsSuccess.Should().BeTrue();

            await _taskRepository.Received(1).UpdateAsync(Arg.Is<TaskItem>(t =>
                t.Id == taskId &&
                t.IsCompleted == true));
        }

        [Fact]
        public async Task DeleteTaskAsync_ShouldCallRepositoryDelete()
        {
            // Arrange
            var taskId = 1;
            _taskRepository.DeleteAsync(taskId).Returns(Result.Success());

            // Act
            var result = await _taskService.DeleteTaskAsync(taskId);

            // Assert
            result.IsSuccess.Should().BeTrue();
            await _taskRepository.Received(1).DeleteAsync(taskId);
        }
    }
}
