namespace TaskManagement.Tests;

public class TaskCategorizationServiceTests
{
    private readonly KeywordTaskCategorizationService _categorizationService;

    public TaskCategorizationServiceTests()
    {
        _categorizationService = new KeywordTaskCategorizationService();
    }

    [Theory]
    [InlineData("Project meeting", "Discuss the latest project developments", "Work")]
    [InlineData("Buy groceries", "Go shopping for the week", "Personal")]
    [InlineData("Doctor appointment", "Annual checkup", "Health")]
    [InlineData("Finish homework", "Complete math assignment", "Education")]
    [InlineData("Pay bills", "Credit card and utilities", "Finance")]
    [InlineData("Random task", "Something that doesn't match keywords", "Uncategorized")]
    public void CategorizeTask_ShouldReturnExpectedCategory(string title, string description, string expectedCategory)
    {
        // Act
        var result = _categorizationService.CategorizeTask(title, description);

        // Assert
        Assert.Equal(expectedCategory, result);
    }

    [Fact]
    public void CategorizeTask_WithMultipleMatches_ShouldReturnCategoryWithMostMatches()
    {
        // Arrange
        var title = "Study finance";
        var description = "Read book about investment strategies";

        // Act
        var result = _categorizationService.CategorizeTask(title, description);

        // Assert
        Assert.Equal("Education", result); // Should match "study", "read" and "book" keywords from Education
    }
}
