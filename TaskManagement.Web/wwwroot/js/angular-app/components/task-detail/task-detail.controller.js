// Task Detail Controller
(function () {
  "use strict";

  angular
    .module("taskManagement")
    .controller("TaskDetailController", TaskDetailController);

  TaskDetailController.$inject = ["$scope", "$routeParams", "$location"];

  function TaskDetailController($scope, $routeParams, $location) {
    var vm = this;

    vm.task = null;
    vm.isLoading = true;
    vm.error = null;
    vm.taskId = $routeParams.id;
    vm.deleteTask = deleteTask;
    vm.completeTask = completeTask;
    vm.goBack = goBack;
    vm.goToEditTask = goToEditTask;

    // Initialize the controller
    initialize();

    function initialize() {
      loadTask();
    }

    function loadTask() {
      vm.isLoading = true;

      // Create TaskService instance
      var taskService = new TaskService();

      taskService
        .getTaskById(vm.taskId)
        .then(function (task) {
          if (task === null) {
            vm.error = "Task not found";
          } else {
            vm.task = task;
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

    function deleteTask() {
      if (confirm("Are you sure you want to delete this task?")) {
        var taskService = new TaskService();

        taskService
          .deleteTask(vm.taskId)
          .then(function () {
            $location.path("/");

            // Apply scope changes since we're using a service outside of Angular
            if (!$scope.$$phase) {
              $scope.$apply();
            }
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

    function completeTask() {
      if (vm.task && !vm.task.isCompleted) {
        var taskService = new TaskService();

        taskService
          .completeTask(vm.taskId)
          .then(function () {
            // Reload task after successful completion
            loadTask();
          })
          .catch(function (error) {
            vm.error = "Error completing task: " + error.message;

            // Apply scope changes since we're using a service outside of Angular
            if (!$scope.$$phase) {
              $scope.$apply();
            }
          });
      }
    }

    function goBack() {
      $location.path("/");
    }

    function goToEditTask() {
      $location.path("/tasks/" + vm.taskId + "/edit");
    }
  }
})();
