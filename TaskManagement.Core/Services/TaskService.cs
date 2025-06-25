using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TaskManagement.Core.Common;
using TaskManagement.Core.Models.Tasks;
using TaskManagement.Core.Repositories;
using TaskManagement.Core.Validations;

namespace TaskManagement.Core.Services
{
    public class TaskService : ITaskService
    {
        private readonly ITaskRepository _taskRepository;
        private readonly ITaskCategorizationService _categorizationService;
        private readonly IValidator<CreateTaskDto> _createTaskValidator;
        private readonly IValidator<UpdateTaskDto> _updateTaskValidator;

        public TaskService(
            ITaskRepository taskRepository,
            ITaskCategorizationService categorizationService,
            IValidator<CreateTaskDto> createTaskValidator,
            IValidator<UpdateTaskDto> updateTaskValidator)
        {
            _taskRepository = taskRepository;
            _categorizationService = categorizationService;
            _createTaskValidator = createTaskValidator;
            _updateTaskValidator = updateTaskValidator;
        }

        public async Task<Result<IEnumerable<TaskDto>>> GetAllTasksAsync()
        {
            var result = await _taskRepository.GetAllAsync();
            return result.Map(tasks => tasks.Select(MapToDto));
        }

        public async Task<Result<TaskDto>> GetTaskByIdAsync(int id)
        {
            var result = await _taskRepository.GetByIdAsync(id);
            return result.Map(MapToDto);
        }

        public async Task<Result<TaskDto>> CreateTaskAsync(CreateTaskDto createTaskDto)
        {
            // Validate the DTO
            var validationResult = _createTaskValidator.Validate(createTaskDto);
            if (!validationResult.IsSuccess)
            {
                return Result.Failure<TaskDto>(validationResult.ErrorMessages);
            }

            var task = new TaskItem
            {
                Title = createTaskDto.Title,
                Description = createTaskDto.Description,
                Priority = createTaskDto.Priority ?? Priority.Medium,
                DueDate = createTaskDto.DueDate,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Apply AI categorization and priority detection
            var analysis = _categorizationService.AnalyzeTask(task.Title, task.Description, task.DueDate);
            task.Category = analysis.Category;

            // Only override priority if it wasn't explicitly set by the user
            if (createTaskDto.Priority == null)
            {
                task.Priority = analysis.SuggestedPriority;
            }

            var result = await _taskRepository.CreateAsync(task);
            return result.Map(MapToDto);
        }

        public async Task<Result> UpdateTaskAsync(int id, UpdateTaskDto updateTaskDto)
        {
            // Validate the DTO
            var validationResult = _updateTaskValidator.Validate(updateTaskDto);
            if (!validationResult.IsSuccess)
            {
                return validationResult;
            }

            // Get the existing task
            var taskResult = await _taskRepository.GetByIdAsync(id);
            if (!taskResult.IsSuccess)
            {
                return taskResult;
            }

            var task = taskResult.Value;

            // Update the task properties
            if (updateTaskDto.Title != null)
                task.Title = updateTaskDto.Title;

            if (updateTaskDto.Description != null)
                task.Description = updateTaskDto.Description;

            if (updateTaskDto.Priority.HasValue)
                task.Priority = updateTaskDto.Priority.Value;

            if (updateTaskDto.DueDate.HasValue)
                task.DueDate = updateTaskDto.DueDate.Value;

            if (updateTaskDto.IsCompleted.HasValue)
                task.IsCompleted = updateTaskDto.IsCompleted.Value;

            // Re-categorize and re-analyze priority if title or description changed
            if (updateTaskDto.Title != null || updateTaskDto.Description != null)
            {
                var analysis = _categorizationService.AnalyzeTask(task.Title, task.Description, task.DueDate);
                task.Category = analysis.Category;

                // Only update priority if it wasn't explicitly set in this update
                if (!updateTaskDto.Priority.HasValue)
                {
                    task.Priority = analysis.SuggestedPriority;
                }
            }

            task.UpdatedAt = DateTime.UtcNow;

            return await _taskRepository.UpdateAsync(task);
        }

        public async Task<Result> CompleteTaskAsync(int id)
        {
            // Get the existing task
            var taskResult = await _taskRepository.GetByIdAsync(id);
            if (!taskResult.IsSuccess)
            {
                return taskResult;
            }

            var task = taskResult.Value;
            task.IsCompleted = true;
            task.UpdatedAt = DateTime.UtcNow;

            return await _taskRepository.UpdateAsync(task);
        }

        public async Task<Result> DeleteTaskAsync(int id)
        {
            return await _taskRepository.DeleteAsync(id);
        }

        private static TaskDto MapToDto(TaskItem task)
        {
            return new TaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = task.Description,
                Priority = task.Priority,
                DueDate = task.DueDate,
                IsCompleted = task.IsCompleted,
                Category = task.Category,
                CreatedAt = task.CreatedAt,
                UpdatedAt = task.UpdatedAt
            };
        }
    }
}
