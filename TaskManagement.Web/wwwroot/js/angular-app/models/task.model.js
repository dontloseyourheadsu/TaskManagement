class TaskModel {
  constructor(data = {}) {
    this.id = data.id || 0;
    this.title = data.title || "";
    this.description = data.description || "";

    // Use numeric value for priority (0=Low, 1=Medium, 2=High)
    // Default to 1 (Medium)
    this.priority = this._parsePriority(data.priority);

    // Handle date parsing
    this.dueDate = this._parseDate(data.dueDate);

    this.isCompleted = !!data.isCompleted;
    this.category = data.category || null;
    this.createdAt = this._parseDate(data.createdAt) || new Date();
    this.updatedAt = this._parseDate(data.updatedAt) || new Date();
  }

  _parsePriority(priority) {
    if (priority === undefined || priority === null) {
      return 1; // Default to Medium
    }

    if (typeof priority === "string") {
      // Handle string values (e.g. "Low", "Medium", "High")
      if (priority.toLowerCase() === "low") return 0;
      if (priority.toLowerCase() === "high") return 2;

      // Try parsing it as a number
      const numValue = parseInt(priority, 10);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 2) {
        return numValue;
      }

      return 1; // Default to Medium
    }

    // Ensure it's a valid number
    if (typeof priority === "number" && priority >= 0 && priority <= 2) {
      return priority;
    }

    return 1; // Default to Medium
  }

  _parseDate(dateValue) {
    if (!dateValue) {
      return null;
    }

    if (dateValue instanceof Date) {
      return dateValue;
    }

    try {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    } catch (e) {
      console.error("Error parsing date:", e);
      return null;
    }
  }

  static fromJson(json) {
    return new TaskModel(json);
  }
}
