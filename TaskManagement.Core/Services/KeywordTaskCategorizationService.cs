namespace TaskManagement.Core.Services;

public class KeywordTaskCategorizationService : ITaskCategorizationService
{
    private readonly Dictionary<string, List<string>> _categoryKeywords = new()
    {
        ["Work"] = new() { "meeting", "project", "deadline", "client", "report", "presentation" },
        ["Personal"] = new() { "shopping", "family", "friend", "appointment", "birthday", "celebration" },
        ["Health"] = new() { "doctor", "exercise", "workout", "diet", "gym", "medication", "health" },
        ["Education"] = new() { "study", "homework", "class", "course", "learn", "read", "book", "school" },
        ["Finance"] = new() { "payment", "bill", "money", "budget", "expense", "save", "invest", "bank" }
    };

    public string CategorizeTask(string title, string description)
    {
        var combinedText = (title + " " + description).ToLower();

        var matches = _categoryKeywords
            .Select(kv => new
            {
                Category = kv.Key,
                MatchCount = kv.Value.Count(keyword => combinedText.Contains(keyword))
            })
            .Where(x => x.MatchCount > 0)
            .OrderByDescending(x => x.MatchCount)
            .FirstOrDefault();

        return matches?.Category ?? "Uncategorized";
    }
}
