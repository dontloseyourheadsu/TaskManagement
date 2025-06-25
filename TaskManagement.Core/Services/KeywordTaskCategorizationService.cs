using System.Text.RegularExpressions;
using TaskManagement.Core.Models.Tasks;

namespace TaskManagement.Core.Services;

public class KeywordTaskCategorizationService : ITaskCategorizationService
{
    private readonly Dictionary<string, List<string>> _categoryKeywords = new()
    {
        ["Work"] = new() { "meeting", "project", "deadline", "client", "report", "presentation", "office", "team", "manager", "business" },
        ["Personal"] = new() { "shopping", "family", "friend", "appointment", "birthday", "celebration", "home", "personal" },
        ["Health"] = new() { "doctor", "exercise", "workout", "diet", "gym", "medication", "health", "medical", "hospital" },
        ["Education"] = new() { "study", "homework", "class", "course", "learn", "read", "book", "school", "university" },
        ["Finance"] = new() { "payment", "bill", "money", "budget", "expense", "save", "invest", "bank", "tax" }
    };

    private readonly Dictionary<Priority, List<string>> _priorityKeywords = new()
    {
        [Priority.High] = new() { "urgent", "asap", "immediate", "critical", "emergency", "important", "deadline", "due today", "overdue" },
        [Priority.Medium] = new() { "soon", "this week", "moderate", "normal", "regular", "standard" },
        [Priority.Low] = new() { "later", "sometime", "eventually", "when possible", "low priority", "nice to have", "optional" }
    };

    private readonly List<string> _dueDatePatterns = new()
    {
        @"due\s+(today|tomorrow|yesterday)",
        @"by\s+(today|tomorrow|yesterday|\d{1,2}\/\d{1,2})",
        @"deadline\s+(today|tomorrow|yesterday)",
        @"expires?\s+(today|tomorrow|yesterday)"
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

    public Priority DetectPriority(string title, string description, DateTime? dueDate = null)
    {
        var combinedText = (title + " " + description).ToLower();

        // Check for explicit priority keywords
        var priorityMatches = _priorityKeywords
            .Select(kv => new
            {
                Priority = kv.Key,
                MatchCount = kv.Value.Count(keyword => combinedText.Contains(keyword))
            })
            .Where(x => x.MatchCount > 0)
            .OrderByDescending(x => x.MatchCount)
            .FirstOrDefault();

        if (priorityMatches != null)
        {
            return priorityMatches.Priority;
        }

        // Check for date-based urgency patterns
        foreach (var pattern in _dueDatePatterns)
        {
            if (Regex.IsMatch(combinedText, pattern, RegexOptions.IgnoreCase))
            {
                return Priority.High;
            }
        }

        // Check due date proximity
        if (dueDate.HasValue)
        {
            var daysUntilDue = (dueDate.Value.Date - DateTime.Now.Date).Days;

            return daysUntilDue switch
            {
                <= 1 => Priority.High,
                <= 7 => Priority.Medium,
                _ => Priority.Low
            };
        }

        // Default to Medium if no clear indicators
        return Priority.Medium;
    }

    public TaskAnalysis AnalyzeTask(string title, string description, DateTime? dueDate = null)
    {
        return new TaskAnalysis
        {
            Category = CategorizeTask(title, description),
            SuggestedPriority = DetectPriority(title, description, dueDate),
            Confidence = CalculateConfidence(title, description)
        };
    }

    private double CalculateConfidence(string title, string description)
    {
        var combinedText = (title + " " + description).ToLower();
        var totalKeywords = _categoryKeywords.SelectMany(kv => kv.Value).Count();
        var matchedKeywords = _categoryKeywords.SelectMany(kv => kv.Value).Count(keyword => combinedText.Contains(keyword));

        return Math.Min(1.0, (double)matchedKeywords / Math.Max(1, totalKeywords) * 10);
    }
}
