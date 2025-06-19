using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TaskManagement.Core.Data;
using TaskManagement.Core.Models.Tasks;
using TaskManagement.Tests.Integration.Setup;
using Xunit;

namespace TaskManagement.Tests.Integration
{
    public class TasksApiTests : IClassFixture<IntegrationTestFixture>
    {
        private readonly IntegrationTestFixture _fixture;
        private readonly HttpClient _client;
        private readonly IServiceProvider _serviceProvider;

        public TasksApiTests(IntegrationTestFixture fixture)
        {
            _fixture = fixture;
            _client = fixture.Client;
            _serviceProvider = fixture.ServiceProvider;
        }

        [Fact]
        public async Task GetAllTasks_ShouldReturnEmptyList_WhenDatabaseIsEmpty()
        {
            // Arrange - Clear the database first
            await _fixture.ClearDatabaseAsync();

            // Act
            var response = await _client.GetAsync("/api/tasks");

            // Debug response
            var responseContent = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"GetAllTasks - Response Status: {response.StatusCode}");
            Console.WriteLine($"GetAllTasks - Response Content: {responseContent}");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var tasks = await response.Content.ReadFromJsonAsync<List<TaskDto>>();
            tasks.Should().NotBeNull();
            tasks.Should().BeEmpty();
        }

        [Fact]
        public async Task CreateTask_ShouldAddTaskToDatabase()
        {
            // Arrange - Clear the database first
            await _fixture.ClearDatabaseAsync();

            var newTask = new CreateTaskDto
            {
                Title = "Integration Test Task",
                Description = "This task was created during integration testing",
                Priority = Priority.High,
                DueDate = DateTime.Now.AddDays(7)
            };

            // Act
            var createResponse = await _client.PostAsJsonAsync("/api/tasks", newTask);

            // Debug response
            var responseContent = await createResponse.Content.ReadAsStringAsync();
            Console.WriteLine($"Response Status: {createResponse.StatusCode}");
            Console.WriteLine($"Response Content: {responseContent}");

            // Assert
            createResponse.StatusCode.Should().Be(HttpStatusCode.Created);
            var createdTask = await createResponse.Content.ReadFromJsonAsync<TaskDto>();
            createdTask.Should().NotBeNull();
            if (createdTask != null)
            {
                createdTask.Title.Should().Be(newTask.Title);
                createdTask.Description.Should().Be(newTask.Description);
                createdTask.Priority.Should().Be(newTask.Priority);

                // Verify task exists in the database
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<TaskDbContext>();
                var taskInDb = await dbContext.Tasks.FindAsync(createdTask.Id);
                taskInDb.Should().NotBeNull();
                taskInDb.Title.Should().Be(newTask.Title);
            }
        }

        [Fact]
        public async Task UpdateTask_ShouldModifyExistingTask()
        {
            // Arrange - Clear the database first
            await _fixture.ClearDatabaseAsync();

            // Create a task first
            var newTask = new CreateTaskDto
            {
                Title = "Task to be updated",
                Description = "This task will be updated",
                Priority = Priority.Medium
            };

            var createResponse = await _client.PostAsJsonAsync("/api/tasks", newTask);
            createResponse.EnsureSuccessStatusCode();
            var createdTask = await createResponse.Content.ReadFromJsonAsync<TaskDto>();

            if (createdTask == null)
            {
                Assert.Fail("Failed to create task for update test");
                return;
            }

            // Prepare update
            var updateDto = new UpdateTaskDto
            {
                Title = "Updated Task Title",
                Description = "This task has been updated",
                Priority = Priority.High,
                DueDate = DateTime.Now.AddDays(3)
            };

            // Act
            var updateResponse = await _client.PutAsJsonAsync($"/api/tasks/{createdTask.Id}", updateDto);

            // Assert
            updateResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

            // Verify task was updated in the database
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<TaskDbContext>();
            var updatedTask = await dbContext.Tasks.FindAsync(createdTask.Id);
            updatedTask.Should().NotBeNull();
            updatedTask.Title.Should().Be(updateDto.Title);
            updatedTask.Description.Should().Be(updateDto.Description);
            updatedTask.Priority.Should().Be(updateDto.Priority);
        }

        [Fact]
        public async Task CompleteTask_ShouldMarkTaskAsCompleted()
        {
            // Arrange - Clear the database first
            await _fixture.ClearDatabaseAsync();

            // Create a task first
            var newTask = new CreateTaskDto
            {
                Title = "Task to be completed",
                Description = "This task will be marked as complete",
                Priority = Priority.Medium
            };

            var createResponse = await _client.PostAsJsonAsync("/api/tasks", newTask);
            createResponse.EnsureSuccessStatusCode();
            var createdTask = await createResponse.Content.ReadFromJsonAsync<TaskDto>();

            if (createdTask == null)
            {
                Assert.Fail("Failed to create task for complete test");
                return;
            }

            // Act
            var completeResponse = await _client.PatchAsync($"/api/tasks/{createdTask.Id}/complete", null);

            // Assert
            completeResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

            // Verify task was marked as completed in the database
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<TaskDbContext>();
            var completedTask = await dbContext.Tasks.FindAsync(createdTask.Id);
            completedTask.Should().NotBeNull();
            completedTask.IsCompleted.Should().BeTrue();
            // Check the completed timestamp is set (not null)
            completedTask.UpdatedAt.Should().BeAfter(completedTask.CreatedAt);
        }

        [Fact]
        public async Task DeleteTask_ShouldRemoveTaskFromDatabase()
        {
            // Arrange - Clear the database first
            await _fixture.ClearDatabaseAsync();

            // Create a task first
            var newTask = new CreateTaskDto
            {
                Title = "Task to be deleted",
                Description = "This task will be deleted",
                Priority = Priority.Low
            };

            var createResponse = await _client.PostAsJsonAsync("/api/tasks", newTask);
            createResponse.EnsureSuccessStatusCode();
            var createdTask = await createResponse.Content.ReadFromJsonAsync<TaskDto>();

            if (createdTask == null)
            {
                Assert.Fail("Failed to create task for delete test");
                return;
            }

            // Act
            var deleteResponse = await _client.DeleteAsync($"/api/tasks/{createdTask.Id}");

            // Assert
            deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

            // Verify task was removed from the database
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<TaskDbContext>();
            var deletedTask = await dbContext.Tasks.FindAsync(createdTask.Id);
            deletedTask.Should().BeNull();
        }

        [Fact]
        public async Task GetTaskById_ShouldReturnNotFound_ForNonExistentTask()
        {
            // Arrange - Clear the database first
            await _fixture.ClearDatabaseAsync();

            // Act - Use an ID that definitely doesn't exist
            var response = await _client.GetAsync("/api/tasks/999");

            // Assert
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
