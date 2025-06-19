using System.Collections.Generic;
using System.Threading.Tasks;
using TaskManagement.Core.Common;
using TaskManagement.Core.Models.Tasks;

namespace TaskManagement.Core.Services
{
    public interface ITaskService
    {
        Task<Result<IEnumerable<TaskDto>>> GetAllTasksAsync();
        Task<Result<TaskDto>> GetTaskByIdAsync(int id);
        Task<Result<TaskDto>> CreateTaskAsync(CreateTaskDto createTaskDto);
        Task<Result> UpdateTaskAsync(int id, UpdateTaskDto updateTaskDto);
        Task<Result> CompleteTaskAsync(int id);
        Task<Result> DeleteTaskAsync(int id);
    }
}
