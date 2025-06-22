// Main Angular module for the Task Management application
(function () {
  "use strict";

  // Create the main Angular module with dependencies
  angular
    .module("taskManagement", [
      "ngRoute", // For routing
    ])
    .config([
      "$routeProvider",
      "$locationProvider",
      function ($routeProvider, $locationProvider) {
        // Configure routes
        $routeProvider
          .when("/", {
            templateUrl:
              "/js/angular-app/components/task-list/task-list.template.html",
            controller: "TaskListController",
            controllerAs: "vm",
          })
          .when("/tasks/new", {
            templateUrl:
              "/js/angular-app/components/task-form/task-form.template.html",
            controller: "TaskFormController",
            controllerAs: "vm",
          })
          .when("/tasks/:id", {
            templateUrl:
              "/js/angular-app/components/task-detail/task-detail.template.html",
            controller: "TaskDetailController",
            controllerAs: "vm",
          })
          .when("/tasks/:id/edit", {
            templateUrl:
              "/js/angular-app/components/task-form/task-form.template.html",
            controller: "TaskFormController",
            controllerAs: "vm",
          })
          .otherwise({
            redirectTo: "/",
          });

        // Use HTML5 History API for cleaner URLs (optional)
        $locationProvider.html5Mode({
          enabled: true,
          requireBase: true,
        });
      },
    ]);
})();
