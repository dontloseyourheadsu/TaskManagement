namespace TaskManagement.Core.Services;

public interface ITaskCategorizationService
{
    string CategorizeTask(string title, string description);
}
