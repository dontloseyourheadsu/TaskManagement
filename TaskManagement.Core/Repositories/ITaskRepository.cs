using System.Collections.Generic;
using System.Threading.Tasks;
using TaskManagement.Core.Common;
using TaskManagement.Core.Models.Tasks;

namespace TaskManagement.Core.Repositories
{
    public interface ITaskRepository
    {
        Task<Result<IEnumerable<TaskItem>>> GetAllAsync();
        Task<Result<TaskItem>> GetByIdAsync(int id);
        Task<Result<TaskItem>> CreateAsync(TaskItem task);
        Task<Result> UpdateAsync(TaskItem task);
        Task<Result> DeleteAsync(int id);
        Task<Result<bool>> ExistsAsync(int id);
    }
}
