using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TaskManagement.Core.Common;
using TaskManagement.Core.Data;
using TaskManagement.Core.Models.Tasks;

namespace TaskManagement.Core.Repositories
{
    public class TaskRepository : ITaskRepository
    {
        private readonly TaskDbContext _context;

        public TaskRepository(TaskDbContext context)
        {
            _context = context;
        }

        public async Task<Result<IEnumerable<TaskItem>>> GetAllAsync()
        {
            try
            {
                var tasks = await _context.Tasks.ToListAsync();
                return Result.Success<IEnumerable<TaskItem>>(tasks);
            }
            catch (Exception ex)
            {
                return Result.Failure<IEnumerable<TaskItem>>($"Failed to get tasks: {ex.Message}");
            }
        }

        public async Task<Result<TaskItem>> GetByIdAsync(int id)
        {
            try
            {
                var task = await _context.Tasks.FindAsync(id);
                if (task == null)
                {
                    return Result.Failure<TaskItem>($"Task with ID {id} not found");
                }
                return Result.Success(task);
            }
            catch (Exception ex)
            {
                return Result.Failure<TaskItem>($"Failed to get task with ID {id}: {ex.Message}");
            }
        }

        public async Task<Result<TaskItem>> CreateAsync(TaskItem task)
        {
            try
            {
                _context.Tasks.Add(task);
                await _context.SaveChangesAsync();
                return Result.Success(task);
            }
            catch (Exception ex)
            {
                return Result.Failure<TaskItem>($"Failed to create task: {ex.Message}");
            }
        }

        public async Task<Result> UpdateAsync(TaskItem task)
        {
            try
            {
                _context.Entry(task).State = EntityState.Modified;
                await _context.SaveChangesAsync();
                return Result.Success();
            }
            catch (DbUpdateConcurrencyException)
            {
                var exists = await _context.Tasks.AnyAsync(t => t.Id == task.Id);
                if (!exists)
                {
                    return Result.Failure($"Task with ID {task.Id} not found");
                }
                throw;
            }
            catch (Exception ex)
            {
                return Result.Failure($"Failed to update task: {ex.Message}");
            }
        }

        public async Task<Result> DeleteAsync(int id)
        {
            try
            {
                var task = await _context.Tasks.FindAsync(id);
                if (task == null)
                {
                    return Result.Failure($"Task with ID {id} not found");
                }

                _context.Tasks.Remove(task);
                await _context.SaveChangesAsync();
                return Result.Success();
            }
            catch (Exception ex)
            {
                return Result.Failure($"Failed to delete task: {ex.Message}");
            }
        }

        public async Task<Result<bool>> ExistsAsync(int id)
        {
            try
            {
                var exists = await _context.Tasks.AnyAsync(e => e.Id == id);
                return Result.Success(exists);
            }
            catch (Exception ex)
            {
                return Result.Failure<bool>($"Failed to check if task exists: {ex.Message}");
            }
        }
    }
}
