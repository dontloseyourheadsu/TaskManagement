using Microsoft.EntityFrameworkCore;
using TaskManagement.Core.Models.Tasks;

namespace TaskManagement.Core.Data;

public class TaskDbContext : DbContext
{
    public DbSet<TaskItem> Tasks { get; set; }

    public TaskDbContext(DbContextOptions<TaskDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Add any additional configurations here
        modelBuilder.Entity<TaskItem>()
            .Property(t => t.Priority)
            .HasConversion<string>();
    }
}
