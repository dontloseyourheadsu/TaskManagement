// Task List Controller
(function () {
  "use strict";

  angular
    .module("taskManagement")
    .controller("TaskListController", TaskListController);

  TaskListController.$inject = ["$scope", "$location"];

  function TaskListController($scope, $location) {
    var vm = this;

    vm.tasks = [];
    vm.isLoading = true;
    vm.error = null;
    vm.deleteTask = deleteTask;
    vm.completeTask = completeTask;
    vm.goToCreateTask = goToCreateTask;
    vm.goToTaskDetail = goToTaskDetail;
    vm.goToEditTask = goToEditTask;
    vm.filterOptions = {
      showCompleted: true,
      category: "",
      priority: "",
    };

    // Initialize the controller
    initialize();

    function initialize() {
      loadTasks();
    }

    function loadTasks() {
      vm.isLoading = true;

      // Create TaskService instance and get tasks
      var taskService = new TaskService();

      taskService
        .getAllTasks()
        .then(function (tasks) {
          vm.tasks = tasks;
          vm.isLoading = false;
          // Apply scope changes since we're using a service outside of Angular
          if (!$scope.$$phase) {
            $scope.$apply();
          }
        })
        .catch(function (error) {
          vm.error = "Error loading tasks: " + error.message;
          vm.isLoading = false;
          // Apply scope changes since we're using a service outside of Angular
          if (!$scope.$$phase) {
            $scope.$apply();
          }
        });
    }

    function deleteTask(taskId) {
      if (confirm("Are you sure you want to delete this task?")) {
        var taskService = new TaskService();

        taskService
          .deleteTask(taskId)
          .then(function () {
            // Reload tasks after successful deletion
            loadTasks();
          })
          .catch(function (error) {
            vm.error = "Error deleting task: " + error.message;
            // Apply scope changes since we're using a service outside of Angular
            if (!$scope.$$phase) {
              $scope.$apply();
            }
          });
      }
    }

    function completeTask(taskId) {
      var taskService = new TaskService();

      taskService
        .completeTask(taskId)
        .then(function () {
          // Reload tasks after successful completion
          loadTasks();
        })
        .catch(function (error) {
          vm.error = "Error completing task: " + error.message;
          // Apply scope changes since we're using a service outside of Angular
          if (!$scope.$$phase) {
            $scope.$apply();
          }
        });
    }

    function goToCreateTask() {
      $location.path("/tasks/new");
    }

    function goToTaskDetail(taskId) {
      $location.path("/tasks/" + taskId);
    }

    function goToEditTask(taskId) {
      $location.path("/tasks/" + taskId + "/edit");
    }
  }
})();
