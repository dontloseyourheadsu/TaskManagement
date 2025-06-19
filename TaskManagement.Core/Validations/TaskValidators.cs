using System;
using System.Collections.Generic;
using TaskManagement.Core.Models.Tasks;

namespace TaskManagement.Core.Validations
{
    public class CreateTaskValidator : BaseValidator<CreateTaskDto>
    {
        protected override void DoValidate(CreateTaskDto entity, List<string> errors)
        {
            // Title validations
            if (string.IsNullOrWhiteSpace(entity.Title))
            {
                errors.Add("Title is required");
            }
            else if (entity.Title.Length > 200)
            {
                errors.Add("Title must not exceed 200 characters");
            }

            // Description validations
            if (string.IsNullOrWhiteSpace(entity.Description))
            {
                errors.Add("Description is required");
            }
            else if (entity.Description.Length > 1000)
            {
                errors.Add("Description must not exceed 1000 characters");
            }

            // Due date validations
            if (entity.DueDate.HasValue && entity.DueDate.Value < DateTime.Today)
            {
                errors.Add("Due date cannot be in the past");
            }
        }
    }

    public class UpdateTaskValidator : BaseValidator<UpdateTaskDto>
    {
        protected override void DoValidate(UpdateTaskDto entity, List<string> errors)
        {
            // Title validations (optional field for updates)
            if (entity.Title != null && entity.Title.Length > 200)
            {
                errors.Add("Title must not exceed 200 characters");
            }

            // Description validations (optional field for updates)
            if (entity.Description != null && entity.Description.Length > 1000)
            {
                errors.Add("Description must not exceed 1000 characters");
            }

            // Due date validations (optional field for updates)
            if (entity.DueDate.HasValue && entity.DueDate.Value < DateTime.Today)
            {
                errors.Add("Due date cannot be in the past");
            }
        }
    }

    public class TaskEntityValidator : BaseValidator<TaskItem>
    {
        protected override void DoValidate(TaskItem entity, List<string> errors)
        {
            // Title validations
            if (string.IsNullOrWhiteSpace(entity.Title))
            {
                errors.Add("Title is required");
            }
            else if (entity.Title.Length > 200)
            {
                errors.Add("Title must not exceed 200 characters");
            }

            // Description validations
            if (string.IsNullOrWhiteSpace(entity.Description))
            {
                errors.Add("Description is required");
            }
            else if (entity.Description.Length > 1000)
            {
                errors.Add("Description must not exceed 1000 characters");
            }

            // Due date validations
            if (entity.DueDate.HasValue && entity.DueDate.Value < DateTime.Today)
            {
                errors.Add("Due date cannot be in the past");
            }
        }
    }
}
