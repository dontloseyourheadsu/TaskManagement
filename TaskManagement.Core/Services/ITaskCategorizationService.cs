using TaskManagement.Core.Models.Tasks;

namespace TaskManagement.Core.Services;

public interface ITaskCategorizationService
{
    string CategorizeTask(string title, string description);
    Priority DetectPriority(string title, string description, DateTime? dueDate = null);
    TaskAnalysis AnalyzeTask(string title, string description, DateTime? dueDate = null);
}

public class TaskAnalysis
{
    public string Category { get; set; } = string.Empty;
    public Priority SuggestedPriority { get; set; }
    public double Confidence { get; set; }
}
