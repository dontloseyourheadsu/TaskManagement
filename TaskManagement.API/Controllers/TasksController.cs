using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using TaskManagement.Core.Common;
using TaskManagement.Core.Models.Tasks;
using TaskManagement.Core.Services;

namespace TaskManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    // GET: api/tasks
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskDto>>> GetTasks()
    {
        var result = await _taskService.GetAllTasksAsync();
        if (!result.IsSuccess)
            return BadRequest(result.ErrorMessages);

        return Ok(result.Value);
    }

    // GET: api/tasks/5
    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(int id)
    {
        var result = await _taskService.GetTaskByIdAsync(id);
        if (!result.IsSuccess)
            return NotFound(result.ErrorMessages);

        return result.Value;
    }

    // POST: api/tasks
    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask(CreateTaskDto createTaskDto)
    {
        var result = await _taskService.CreateTaskAsync(createTaskDto);
        if (!result.IsSuccess)
            return BadRequest(result.ErrorMessages);

        return CreatedAtAction(nameof(GetTask), new { id = result.Value.Id }, result.Value);
    }

    // PUT: api/tasks/5
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, UpdateTaskDto updateTaskDto)
    {
        var result = await _taskService.UpdateTaskAsync(id, updateTaskDto);
        if (!result.IsSuccess)
        {
            if (result.ErrorMessages.Contains($"Task with ID {id} not found"))
                return NotFound(result.ErrorMessages);

            return BadRequest(result.ErrorMessages);
        }

        return NoContent();
    }

    // PATCH: api/tasks/5/complete
    [HttpPatch("{id}/complete")]
    public async Task<IActionResult> CompleteTask(int id)
    {
        var result = await _taskService.CompleteTaskAsync(id);
        if (!result.IsSuccess)
        {
            if (result.ErrorMessages.Contains($"Task with ID {id} not found"))
                return NotFound(result.ErrorMessages);

            return BadRequest(result.ErrorMessages);
        }

        return NoContent();
    }

    // DELETE: api/tasks/5
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var result = await _taskService.DeleteTaskAsync(id);
        if (!result.IsSuccess)
        {
            if (result.ErrorMessages.Contains($"Task with ID {id} not found"))
                return NotFound(result.ErrorMessages);

            return BadRequest(result.ErrorMessages);
        }

        return NoContent();
    }
}
