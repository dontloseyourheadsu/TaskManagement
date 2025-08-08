import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { Task, ViewType, ViewOption, UpdateTaskRequest } from '../../models/task.model';
import { TaskStorageService } from '../../services/task-storage.service';
import { TaskApiService } from '../../services/task-api.service';
import { CalendarService } from '../../services/calendar.service';
import { CalendarComponent } from '../calendar/calendar.component';
import { KanbanViewComponent } from '../kanban/kanban-view.component';
import { ListViewComponent, FilterState } from '../list-view/list-view.component';
import { TaskDialogComponent, TaskDialogData } from '../task-dialog/task-dialog.component';

@Component({
  selector: 'app-task-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    CalendarComponent,
    KanbanViewComponent,
    ListViewComponent
  ],
  providers: [
    { provide: TaskStorageService, useClass: TaskApiService }
  ],
  templateUrl: './task-viewer.component.html',
  styleUrls: ['./task-viewer.component.css']
})
export class TaskViewerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  tasks: Task[] = [];
  currentView: ViewType = ViewType.WEEK;
  ViewType = ViewType; // Expose enum to template
  
  // Filter state for list view
  currentFilterState: FilterState | null = null;
  
  contextMenu = { 
    visible: false, 
    x: 0, 
    y: 0, 
    task: null as Task | null 
  };

  viewOptions: ViewOption[] = [
    { type: ViewType.WEEK, label: 'Week', icon: 'calendar_view_week' },
    { type: ViewType.KANBAN, label: 'Kanban', icon: 'view_column' },
    { type: ViewType.LIST, label: 'List', icon: 'list' }
  ];

  constructor(
    private taskStorage: TaskStorageService,
    private calendarService: CalendarService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTasks(): void {
    this.taskStorage.getTasks()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => {
        this.tasks = tasks;
      });
  }

  onViewChange(event: any): void {
    this.currentView = event.value;
    this.contextMenu.visible = false;
  }

  onTaskClick(task: Task): void {
    this.editTask(task);
  }

  onTaskRightClick(data: {task: Task, event: MouseEvent}): void {
    this.contextMenu = {
      visible: true,
      x: data.event.clientX,
      y: data.event.clientY,
      task: data.task
    };
  }

  onTaskCreate(task: Task): void {
    this.loadTasks();
  }

  onTaskUpdate(task: Task): void {
    this.loadTasks();
  }

  onTaskDelete(taskId: string): void {
    this.loadTasks();
  }

  onTaskCompletedChange(data: {task: Task, completed: boolean}): void {
    const updateRequest: UpdateTaskRequest = {
      id: data.task.id,
      completed: data.completed
    };
    
    this.taskStorage.updateTask(updateRequest).subscribe(() => {
      this.loadTasks();
    });
  }

  // Week navigation methods
  previousWeek(): void {
    this.calendarService.navigateWeek('previous');
  }

  nextWeek(): void {
    this.calendarService.navigateWeek('next');
  }

  goToToday(): void {
    this.calendarService.goToToday();
  }

  openTaskDialog(): void {
    const dialogData: TaskDialogData = {
      mode: 'create'
    };

    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '500px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskStorage.createTask(result).subscribe(() => {
          this.loadTasks();
        });
      }
    });
  }

  editTask(task: Task): void {
    this.contextMenu.visible = false;
    
    const dialogData: TaskDialogData = {
      mode: 'edit',
      task
    };

    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '500px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const updateRequest: UpdateTaskRequest = {
          id: task.id,
          ...result
        };
        
        this.taskStorage.updateTask(updateRequest).subscribe(() => {
          this.loadTasks();
        });
      }
    });
  }

  toggleTaskCompleted(task: Task): void {
    this.contextMenu.visible = false;
    
    const updateRequest: UpdateTaskRequest = {
      id: task.id,
      completed: !task.completed
    };
    
    this.taskStorage.updateTask(updateRequest).subscribe(() => {
      this.loadTasks();
    });
  }

  deleteTask(task: Task): void {
    this.contextMenu.visible = false;
    
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.taskStorage.deleteTask(task.id).subscribe(() => {
        this.loadTasks();
      });
    }
  }

  // List view specific methods
  onFiltersChange(filterState: FilterState): void {
    this.currentFilterState = filterState;
    
    // Convert FilterState to API filter format and apply server-side filtering
    if (this.taskStorage instanceof TaskApiService) {
      const apiFilters = {
        taskTypes: filterState.taskTypes.size > 0 ? Array.from(filterState.taskTypes) : undefined,
        completed: filterState.completed !== null ? filterState.completed : undefined,
        urgent: filterState.urgent !== null ? filterState.urgent : undefined,
        title: filterState.title || undefined,
        sortField: filterState.sortField,
        sortOrder: filterState.sortOrder
      };

      // Only make API call if there are actual filters applied
      if (this.hasActiveApiFilters(apiFilters)) {
        this.taskStorage.getTasksWithFilters(apiFilters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(tasks => {
            this.tasks = tasks;
          });
      } else {
        // No filters, load all tasks
        this.loadTasks();
      }
    }
    
    console.log('Filter state changed:', filterState);
  }

  private hasActiveApiFilters(filters: any): boolean {
    return !!(filters.taskTypes?.length || 
             filters.completed !== undefined || 
             filters.urgent !== undefined || 
             filters.title ||
             (filters.sortField !== 'created_at' || filters.sortOrder !== 'desc'));
  }
}
