class TaskService {
  constructor() {
    // Get API base URL from the application config
    const apiBaseUrl = window.taskManagementConfig?.apiBaseUrl;
    this.apiUrl = `${apiBaseUrl}/api/tasks`;

    console.log("TaskService initialized with API URL:", this.apiUrl);
  }

  async getAllTasks() {
    try {
      console.log("Fetching all tasks from API:", this.apiUrl);
      const response = await fetch(this.apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        // Removing credentials: "include" to avoid CORS issues
        mode: "cors",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data.map((task) => TaskModel.fromJson(task));
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }
  }

  async getTaskById(id) {
    try {
      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return TaskModel.fromJson(data);
    } catch (error) {
      console.error(`Error fetching task with ID ${id}:`, error);
      throw error;
    }
  }

  async createTask(task) {
    try {
      // Ensure we have the required fields
      if (!task.title || !task.description) {
        throw new Error("Title and description are required");
      }

      // Create a new object with only the properties needed by the API
      const taskData = {
        title: task.title,
        description: task.description,
        priority:
          typeof task.priority === "string"
            ? parseInt(task.priority, 10)
            : task.priority,
        dueDate: task.dueDate,
      };

      console.log("Sending task data to API:", JSON.stringify(taskData));
      console.log("API endpoint:", this.apiUrl);

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors", // Enable CORS
        body: JSON.stringify(taskData),
      });

      console.log("API Response status:", response.status);

      if (!response.ok) {
        let errorMessage = `HTTP error! Status: ${response.status}`;
        let errorDetails = null;

        try {
          const responseText = await response.text();
          console.log("Error response body:", responseText);

          if (responseText) {
            try {
              errorDetails = JSON.parse(responseText);

              if (Array.isArray(errorDetails)) {
                errorMessage = errorDetails.join(", ");
              } else if (errorDetails.message) {
                errorMessage = errorDetails.message;
              } else if (typeof errorDetails === "string") {
                errorMessage = errorDetails;
              } else {
                console.log("Error details:", errorDetails);
              }
            } catch (parseError) {
              // If it's not valid JSON, use the text as the error message
              errorMessage = responseText || errorMessage;
            }
          }
        } catch (e) {
          console.error("Failed to read error response:", e);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return TaskModel.fromJson(data);
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  }

  async updateTask(id, task) {
    try {
      // Create a new object with only the properties needed by the API
      const taskData = {
        title: task.title,
        description: task.description,
        priority:
          typeof task.priority === "string"
            ? parseInt(task.priority, 10)
            : task.priority,
        dueDate: task.dueDate,
        isCompleted: task.isCompleted,
      };

      console.log("Updating task data:", JSON.stringify(taskData));

      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! Status: ${response.status}`;

        try {
          const responseText = await response.text();
          console.log("Error response body:", responseText);

          if (responseText) {
            try {
              const errorDetails = JSON.parse(responseText);

              if (Array.isArray(errorDetails)) {
                errorMessage = errorDetails.join(", ");
              } else if (errorDetails.message) {
                errorMessage = errorDetails.message;
              } else if (typeof errorDetails === "string") {
                errorMessage = errorDetails;
              } else {
                console.log("Error details:", errorDetails);
              }
            } catch (parseError) {
              // If it's not valid JSON, use the text as the error message
              errorMessage = responseText || errorMessage;
            }
          }
        } catch (e) {
          console.error("Failed to read error response:", e);
        }

        throw new Error(errorMessage);
      }

      return true;
    } catch (error) {
      console.error(`Error updating task with ID ${id}:`, error);
      throw error;
    }
  }

  async completeTask(id) {
    try {
      const response = await fetch(`${this.apiUrl}/${id}/complete`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }

      return true;
    } catch (error) {
      console.error(`Error completing task with ID ${id}:`, error);
      throw error;
    }
  }

  async deleteTask(id) {
    try {
      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }

      return true;
    } catch (error) {
      console.error(`Error deleting task with ID ${id}:`, error);
      throw error;
    }
  }
}
