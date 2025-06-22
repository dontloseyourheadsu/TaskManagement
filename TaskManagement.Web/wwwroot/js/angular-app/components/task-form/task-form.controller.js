// Task Form Controller
(function () {
  "use strict";

  angular
    .module("taskManagement")
    .controller("TaskFormController", TaskFormController);

  TaskFormController.$inject = ["$scope", "$routeParams", "$location"];

  function TaskFormController($scope, $routeParams, $location) {
    var vm = this;

    // Initialize task object with default values
    vm.task = new TaskModel();
    vm.isEditMode = false;
    vm.isLoading = false;
    vm.isSaving = false;
    vm.error = null;
    vm.submitForm = submitForm;
    vm.cancel = cancel;
    vm.today = new Date(); // For date validation

    // Initialize the controller
    initialize();

    function initialize() {
      var taskId = $routeParams.id;

      // If we have a task ID, we're in edit mode
      if (taskId) {
        vm.isEditMode = true;
        loadTask(taskId);
      }

      // Ensure priority is numeric - default to Medium (1)
      vm.task.priority = 1;
    }

    function loadTask(taskId) {
      vm.isLoading = true;

      var taskService = new TaskService();

      taskService
        .getTaskById(taskId)
        .then(function (task) {
          if (task === null) {
            vm.error = "Task not found";
            $location.path("/");
          } else {
            vm.task = task;

            // Ensure priority is numeric
            if (typeof vm.task.priority === "string") {
              vm.task.priority = parseInt(vm.task.priority, 10) || 1;
            }
          }
          vm.isLoading = false;

          // Apply scope changes since we're using a service outside of Angular
          if (!$scope.$$phase) {
            $scope.$apply();
          }
        })
        .catch(function (error) {
          vm.error = "Error loading task: " + error.message;
          vm.isLoading = false;

          // Apply scope changes since we're using a service outside of Angular
          if (!$scope.$$phase) {
            $scope.$apply();
          }
        });
    }

    function submitForm() {
      console.log("Form submission triggered");
      console.log(
        "Form validity:",
        $scope.taskForm ? $scope.taskForm.$valid : "form not available"
      );
      if ($scope.taskForm) {
        console.log("Form errors:", $scope.taskForm.$error);
      }

      // Force-continue even if form appears invalid - we'll validate again manually
      // This helps bypass potential Angular form validation issues

      vm.isSaving = true;
      vm.error = null;

      try {
        // Manual validation before proceeding
        if (!vm.task.title || !vm.task.description) {
          vm.error = "Title and description are required fields.";
          vm.isSaving = false;
          return;
        }

        console.log("Form submitted with task:", JSON.stringify(vm.task));

        // Create a clean object for the API
        var taskData = {
          title: vm.task.title.trim(),
          description: vm.task.description.trim(),
          priority:
            typeof vm.task.priority === "number"
              ? vm.task.priority
              : parseInt(vm.task.priority || "1", 10),
        };

        // Default to Medium priority if we end up with an invalid value
        if (
          isNaN(taskData.priority) ||
          taskData.priority < 0 ||
          taskData.priority > 2
        ) {
          taskData.priority = 1;
        }

        // Format the date if it exists
        if (vm.task.dueDate) {
          try {
            let dateValue = vm.task.dueDate;
            let dateObj;

            if (dateValue instanceof Date) {
              dateObj = dateValue;
            } else if (typeof dateValue === "string") {
              // For YYYY-MM-DD format from input type="date"
              if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                dateValue = dateValue + "T12:00:00.000Z";
              }
              dateObj = new Date(dateValue);
            }

            if (dateObj && !isNaN(dateObj.getTime())) {
              taskData.dueDate = dateObj.toISOString();
              console.log("Formatted date:", taskData.dueDate);
            } else {
              console.warn("Invalid date value:", dateValue);
              // Set to null rather than sending an invalid date
              taskData.dueDate = null;
            }
          } catch (dateError) {
            console.error("Date processing error:", dateError);
            taskData.dueDate = null;
          }
        } else {
          taskData.dueDate = null;
        }

        // Debug information
        console.log("Task form data:", vm.task);
        console.log("Processed task data to send:", taskData);
        console.log("Priority type:", typeof taskData.priority);

        // Final debug log of the data we're sending to the API
        console.log(
          "Final task data being sent to API:",
          JSON.stringify(taskData)
        );

        var taskService = new TaskService();

        // Different API calls for create vs update
        var promise = vm.isEditMode
          ? taskService.updateTask(vm.task.id, taskData)
          : taskService.createTask(taskData);

        promise
          .then(function (response) {
            console.log("API call successful!");
            console.log("API response:", response);

            // Success! Navigate back to task list
            vm.isSaving = false;
            $location.path("/");

            // Apply scope changes since we're using a service outside of Angular
            if (!$scope.$$phase) {
              $scope.$apply();
            }
          })
          .catch(function (error) {
            console.error("Error from API:", error);

            // Provide a more user-friendly error message
            if (error.message && error.message.includes("Failed to fetch")) {
              vm.error =
                "Unable to connect to the API server. Please check your network connection and ensure the API is running.";
            } else if (
              error.message &&
              error.message.includes("NetworkError")
            ) {
              vm.error =
                "Network error occurred. This might be due to CORS restrictions or the API server being unavailable.";
            } else {
              vm.error = "Error saving task: " + error.message;
            }

            vm.isSaving = false;

            // Apply scope changes since we're using a service outside of Angular
            if (!$scope.$$phase) {
              $scope.$apply();
            }
          });
      } catch (error) {
        vm.error = "Error preparing task data: " + error.message;
        vm.isSaving = false;
        console.error("Exception:", error);

        // Apply scope changes since we're using an exception outside of Angular
        if (!$scope.$$phase) {
          $scope.$apply();
        }
      }
    }

    function cancel() {
      $location.path("/");
    }
  }
})();
