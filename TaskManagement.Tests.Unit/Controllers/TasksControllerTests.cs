using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;
using TaskManagement.API.Controllers;
using TaskManagement.Core.Common;
using TaskManagement.Core.Models.Tasks;
using TaskManagement.Core.Services;
using Xunit;

namespace TaskManagement.Tests.Unit.Controllers
{
    public class TasksControllerTests
    {
        private readonly ITaskService _taskService;
        private readonly TasksController _controller;

        public TasksControllerTests()
        {
            _taskService = Substitute.For<ITaskService>();
            _controller = new TasksController(_taskService);
        }

        [Fact]
        public async Task GetTasks_ReturnsOk_WhenServiceReturnsSuccess()
        {
            // Arrange
            var tasks = new List<TaskDto>
            {
                new() { Id = 1, Title = "Task 1" },
                new() { Id = 2, Title = "Task 2" }
            };

            _taskService.GetAllTasksAsync().Returns(Result.Success<IEnumerable<TaskDto>>(tasks));

            // Act
            var response = await _controller.GetTasks();

            // Assert
            var okResult = response.Result as OkObjectResult;
            okResult.Should().NotBeNull();

            var returnedTasks = okResult!.Value as IEnumerable<TaskDto>;
            returnedTasks.Should().NotBeNull();
            returnedTasks.Should().HaveCount(2);
            returnedTasks.Should().BeEquivalentTo(tasks);
        }

        [Fact]
        public async Task GetTasks_ReturnsBadRequest_WhenServiceReturnsFailure()
        {
            // Arrange
            var errorMessage = "Something went wrong";
            _taskService.GetAllTasksAsync().Returns(Result.Failure<IEnumerable<TaskDto>>(errorMessage));

            // Act
            var response = await _controller.GetTasks();

            // Assert
            var badRequestResult = response.Result as BadRequestObjectResult;
            badRequestResult.Should().NotBeNull();

            var returnedErrors = badRequestResult!.Value as List<string>;
            returnedErrors.Should().NotBeNull();
            returnedErrors.Should().Contain(errorMessage);
        }

        [Fact]
        public async Task GetTask_ReturnsTask_WhenTaskExists()
        {
            // Arrange
            var taskId = 1;
            var task = new TaskDto
            {
                Id = taskId,
                Title = "Test Task",
                Description = "Test Description"
            };

            _taskService.GetTaskByIdAsync(taskId).Returns(Result.Success(task));

            // Act
            var response = await _controller.GetTask(taskId);

            // Assert
            response.Value.Should().BeEquivalentTo(task);
        }

        [Fact]
        public async Task GetTask_ReturnsNotFound_WhenTaskDoesNotExist()
        {
            // Arrange
            var taskId = 999;
            _taskService.GetTaskByIdAsync(taskId).Returns(Result.Failure<TaskDto>($"Task with ID {taskId} not found"));

            // Act
            var response = await _controller.GetTask(taskId);

            // Assert
            var notFoundResult = response.Result as NotFoundObjectResult;
            notFoundResult.Should().NotBeNull();
        }

        [Fact]
        public async Task CreateTask_ReturnsCreatedAtAction_WhenSuccessful()
        {
            // Arrange
            var createTaskDto = new CreateTaskDto
            {
                Title = "New Task",
                Description = "New Description"
            };

            var createdTask = new TaskDto
            {
                Id = 1,
                Title = createTaskDto.Title,
                Description = createTaskDto.Description,
                CreatedAt = DateTime.UtcNow
            };

            _taskService.CreateTaskAsync(createTaskDto).Returns(Result.Success(createdTask));

            // Act
            var response = await _controller.CreateTask(createTaskDto);

            // Assert
            var createdAtActionResult = response.Result as CreatedAtActionResult;
            createdAtActionResult.Should().NotBeNull();
            createdAtActionResult!.ActionName.Should().Be(nameof(TasksController.GetTask));
            createdAtActionResult!.RouteValues!["id"].Should().Be(createdTask.Id);
            createdAtActionResult!.Value.Should().BeEquivalentTo(createdTask);
        }

        [Fact]
        public async Task CreateTask_ReturnsBadRequest_WhenValidationFails()
        {
            // Arrange
            var createTaskDto = new CreateTaskDto
            {
                Title = "",
                Description = "New Description"
            };

            var validationError = "Title is required";
            _taskService.CreateTaskAsync(createTaskDto).Returns(Result.Failure<TaskDto>(validationError));

            // Act
            var response = await _controller.CreateTask(createTaskDto);

            // Assert
            var badRequestResult = response.Result as BadRequestObjectResult;
            badRequestResult.Should().NotBeNull();

            var returnedErrors = badRequestResult!.Value as List<string>;
            returnedErrors.Should().NotBeNull();
            returnedErrors.Should().Contain(validationError);
        }

        [Fact]
        public async Task UpdateTask_ReturnsNoContent_WhenUpdateSucceeds()
        {
            // Arrange
            var taskId = 1;
            var updateTaskDto = new UpdateTaskDto
            {
                Title = "Updated Title"
            };

            _taskService.UpdateTaskAsync(taskId, updateTaskDto).Returns(Result.Success());

            // Act
            var response = await _controller.UpdateTask(taskId, updateTaskDto);

            // Assert
            response.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task UpdateTask_ReturnsNotFound_WhenTaskDoesNotExist()
        {
            // Arrange
            var taskId = 999;
            var updateTaskDto = new UpdateTaskDto
            {
                Title = "Updated Title"
            };

            _taskService.UpdateTaskAsync(taskId, updateTaskDto)
                .Returns(Result.Failure($"Task with ID {taskId} not found"));

            // Act
            var response = await _controller.UpdateTask(taskId, updateTaskDto);

            // Assert
            response.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task CompleteTask_ReturnsNoContent_WhenSuccessful()
        {
            // Arrange
            var taskId = 1;
            _taskService.CompleteTaskAsync(taskId).Returns(Result.Success());

            // Act
            var response = await _controller.CompleteTask(taskId);

            // Assert
            response.Should().BeOfType<NoContentResult>();
        }

        [Fact]
        public async Task DeleteTask_ReturnsNoContent_WhenSuccessful()
        {
            // Arrange
            var taskId = 1;
            _taskService.DeleteTaskAsync(taskId).Returns(Result.Success());

            // Act
            var response = await _controller.DeleteTask(taskId);

            // Assert
            response.Should().BeOfType<NoContentResult>();
        }
    }
}
