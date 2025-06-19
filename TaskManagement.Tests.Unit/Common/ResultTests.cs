using System;
using System.Collections.Generic;
using FluentAssertions;
using TaskManagement.Core.Common;
using Xunit;

namespace TaskManagement.Tests.Unit.Common
{
    public class ResultTests
    {
        [Fact]
        public void Success_ShouldReturnSuccessResult()
        {
            // Act
            var result = Result.Success();

            // Assert
            result.IsSuccess.Should().BeTrue();
            result.ErrorMessages.Should().BeEmpty();
        }

        [Fact]
        public void SuccessWithValue_ShouldReturnSuccessResultWithValue()
        {
            // Arrange
            var expectedValue = "test value";

            // Act
            var result = Result.Success(expectedValue);

            // Assert
            result.IsSuccess.Should().BeTrue();
            result.ErrorMessages.Should().BeEmpty();
            result.Value.Should().Be(expectedValue);
        }

        [Fact]
        public void Failure_WithSingleError_ShouldReturnFailureResult()
        {
            // Arrange
            var expectedError = "Error message";

            // Act
            var result = Result.Failure(expectedError);

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.ErrorMessages.Should().ContainSingle();
            result.ErrorMessages.Should().Contain(expectedError);
        }

        [Fact]
        public void Failure_WithMultipleErrors_ShouldReturnFailureResult()
        {
            // Arrange
            var expectedErrors = new[] { "Error 1", "Error 2" };

            // Act
            var result = Result.Failure(expectedErrors);

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.ErrorMessages.Should().HaveCount(2);
            result.ErrorMessages.Should().ContainInOrder(expectedErrors);
        }

        [Fact]
        public void FailureWithTypedResult_ShouldReturnFailureResultWithDefaultValue()
        {
            // Arrange
            var expectedError = "Error message";

            // Act
            var result = Result.Failure<string>(expectedError);

            // Assert
            result.IsSuccess.Should().BeFalse();
            result.ErrorMessages.Should().ContainSingle();
            result.ErrorMessages.Should().Contain(expectedError);
            result.Value.Should().BeNull();
        }

        [Fact]
        public void Map_OnSuccessResult_ShouldMapValue()
        {
            // Arrange
            var result = Result.Success(5);

            // Act
            var mappedResult = result.Map(x => x.ToString());

            // Assert
            mappedResult.IsSuccess.Should().BeTrue();
            mappedResult.Value.Should().Be("5");
        }

        [Fact]
        public void Map_OnFailureResult_ShouldReturnFailureWithSameErrors()
        {
            // Arrange
            var errors = new[] { "Error 1", "Error 2" };
            var result = Result.Failure<int>(errors);

            // Act
            var mappedResult = result.Map(x => x.ToString());

            // Assert
            mappedResult.IsSuccess.Should().BeFalse();
            mappedResult.ErrorMessages.Should().BeEquivalentTo(errors);
        }

        [Fact]
        public void Map_ThrowsException_ShouldReturnFailure()
        {
            // Arrange
            var result = Result.Success(5);

            // Act
            var mappedResult = result.Map<int, string>(x => throw new InvalidOperationException("Mapping failed"));

            // Assert
            mappedResult.IsSuccess.Should().BeFalse();
            mappedResult.ErrorMessages.Should().ContainSingle(e => e.Contains("Mapping failed"));
        }
    }
}
