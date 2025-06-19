using System;
using FluentAssertions;
using TaskManagement.Core.Models.Tasks;
using TaskManagement.Core.Validations;
using Xunit;

namespace TaskManagement.Tests.Unit.Validations
{
    public class TaskValidatorsTests
    {
        [Fact]
        public void CreateTaskValidator_WithValidData_ShouldReturnSuccess()
        {
            // Arrange
            var validator = new CreateTaskValidator();
            var taskDto = new CreateTaskDto
            {
                Title = "Test Task",
                Description = "This is a test task",
                Priority = Priority.Medium,
                DueDate = DateTime.UtcNow.AddDays(1)
            };

            // Act
            var result = validator.Validate(taskDto);

            // Assert
            result.IsSuccess.Should().BeTrue();
            result.ErrorMessages.Should().BeEmpty();
        }

        [Fact]
        public void CreateTaskValidator_WithEmptyTitle_ShouldReturnFailure()
        {
            // Arrange
            var validator = new CreateTaskValidator();
            var taskDto = new CreateTaskDto
            {
                Title = "",
                Description = "This is a test task",
                Priority = Priority.Medium,
                DueDate = DateTime.UtcNow.AddDays(1)
            };

            // Act
            var result = validator.Validate(taskDto);

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.ErrorMessages.Should().Contain(e => e.Contains("Title"));
        }

        [Fact]
        public void CreateTaskValidator_WithLongTitle_ShouldReturnFailure()
        {
            // Arrange
            var validator = new CreateTaskValidator();
            var taskDto = new CreateTaskDto
            {
                Title = new string('x', 201), // 201 characters
                Description = "This is a test task",
                Priority = Priority.Medium,
                DueDate = DateTime.UtcNow.AddDays(1)
            };

            // Act
            var result = validator.Validate(taskDto);

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.ErrorMessages.Should().Contain(e => e.Contains("Title") && e.Contains("exceed"));
        }

        [Fact]
        public void CreateTaskValidator_WithPastDueDate_ShouldReturnFailure()
        {
            // Arrange
            var validator = new CreateTaskValidator();
            var taskDto = new CreateTaskDto
            {
                Title = "Test Task",
                Description = "This is a test task",
                Priority = Priority.Medium,
                DueDate = DateTime.Today.AddDays(-1) // yesterday
            };

            // Act
            var result = validator.Validate(taskDto);

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.ErrorMessages.Should().Contain(e => e.ToLower().Contains("due date") && e.ToLower().Contains("past"));
        }

        [Fact]
        public void UpdateTaskValidator_WithValidData_ShouldReturnSuccess()
        {
            // Arrange
            var validator = new UpdateTaskValidator();
            var taskDto = new UpdateTaskDto
            {
                Title = "Updated Task",
                Description = "This is an updated task",
                Priority = Priority.High,
                DueDate = DateTime.UtcNow.AddDays(2)
            };

            // Act
            var result = validator.Validate(taskDto);

            // Assert
            result.IsSuccess.Should().BeTrue();
            result.ErrorMessages.Should().BeEmpty();
        }

        [Fact]
        public void UpdateTaskValidator_WithNullFields_ShouldReturnSuccess()
        {
            // Arrange
            var validator = new UpdateTaskValidator();
            var taskDto = new UpdateTaskDto
            {
                Title = null,
                Description = null
            };

            // Act
            var result = validator.Validate(taskDto);

            // Assert
            result.IsSuccess.Should().BeTrue();
            result.ErrorMessages.Should().BeEmpty();
        }

        [Fact]
        public void UpdateTaskValidator_WithLongTitle_ShouldReturnFailure()
        {
            // Arrange
            var validator = new UpdateTaskValidator();
            var taskDto = new UpdateTaskDto
            {
                Title = new string('x', 201), // 201 characters
            };

            // Act
            var result = validator.Validate(taskDto);

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.ErrorMessages.Should().Contain(e => e.Contains("Title") && e.Contains("exceed"));
        }
    }
}
