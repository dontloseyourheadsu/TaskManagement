import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';

import { Task, ViewType, ViewOption, UpdateTaskRequest } from '../models/task.model';
import { TaskStorageService, LocalStorageTaskService } from '../services/task-storage.service';
import { CalendarService } from '../services/calendar.service';
import { CalendarComponent } from './calendar.component';
import { KanbanViewComponent } from './kanban-view.component';
import { TaskDialogComponent, TaskDialogData } from './task-dialog.component';

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
    KanbanViewComponent
  ],
  providers: [
    { provide: TaskStorageService, useClass: LocalStorageTaskService }
  ],
  template: `
    <div class="task-viewer-container">
      <!-- Top navigation bar -->
      <mat-toolbar class="viewer-toolbar">
        <span>Task Management</span>
        <span class="spacer"></span>
        
        <!-- View toggle buttons -->
        <mat-button-toggle-group [value]="currentView" 
                                (change)="onViewChange($event)"
                                class="view-toggle">
          <mat-button-toggle *ngFor="let view of viewOptions" 
                           [value]="view.type">
            <mat-icon>{{ view.icon }}</mat-icon>
            <span class="toggle-label">{{ view.label }}</span>
          </mat-button-toggle>
        </mat-button-toggle-group>
        
        <!-- Add task button -->
        <button mat-raised-button color="accent" 
                (click)="openTaskDialog()"
                class="add-task-button">
          <mat-icon>add</mat-icon>
          New Task
        </button>
      </mat-toolbar>

      <!-- View container -->
      <div class="view-container">
        <!-- Week View -->
        <app-calendar 
          *ngIf="currentView === ViewType.WEEK"
          [tasks]="tasks"
          (taskClick)="onTaskClick($event)"
          (taskRightClick)="onTaskRightClick($event)"
          (taskCreate)="onTaskCreate($event)"
          (taskUpdate)="onTaskUpdate($event)"
          (taskDelete)="onTaskDelete($event)"
          (taskCompletedChange)="onTaskCompletedChange($event)">
        </app-calendar>

        <!-- Kanban View -->
        <app-kanban-view 
          *ngIf="currentView === ViewType.KANBAN"
          [tasks]="tasks"
          (taskClick)="onTaskClick($event)"
          (taskRightClick)="onTaskRightClick($event)"
          (taskCompletedChange)="onTaskCompletedChange($event)">
        </app-kanban-view>

        <!-- List View (placeholder) -->
        <div *ngIf="currentView === ViewType.LIST" class="list-view-placeholder">
          <mat-icon>list</mat-icon>
          <h3>List View</h3>
          <p>List view coming soon...</p>
        </div>
      </div>

      <!-- Context menu -->
      <div class="context-menu" 
           *ngIf="contextMenu.visible"
           [style.top.px]="contextMenu.y"
           [style.left.px]="contextMenu.x">
        <div class="context-menu-item" (click)="editTask(contextMenu.task!)">
          <mat-icon>edit</mat-icon> Edit
        </div>
        <div class="context-menu-item" 
             (click)="toggleTaskCompleted(contextMenu.task!)">
          <mat-icon>{{ contextMenu.task?.completed ? 'undo' : 'check' }}</mat-icon> 
          {{ contextMenu.task?.completed ? 'Mark Incomplete' : 'Mark Complete' }}
        </div>
        <div class="context-menu-item" (click)="deleteTask(contextMenu.task!)">
          <mat-icon>delete</mat-icon> Delete
        </div>
      </div>
    </div>
  `,
  styles: [`
    .task-viewer-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .viewer-toolbar {
      background: var(--primary-purple) !important;
      color: white !important;
      min-height: 64px;
      padding: 0 16px;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .view-toggle {
      margin-right: 16px;
    }

    .view-toggle .mat-button-toggle {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .view-toggle .mat-button-toggle.mat-button-toggle-checked {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .toggle-label {
      margin-left: 8px;
    }

    .add-task-button {
      background-color: var(--accent-purple) !important;
      color: var(--primary-purple) !important;
    }

    .view-container {
      flex: 1;
      overflow: hidden;
      background: var(--background-purple);
    }

    .list-view-placeholder {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      color: #666;
    }

    .list-view-placeholder mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      color: #ddd;
    }

    .list-view-placeholder h3 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .list-view-placeholder p {
      margin: 0;
      color: #666;
    }

    .context-menu {
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      min-width: 180px;
    }

    .context-menu-item {
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .context-menu-item:hover {
      background-color: var(--background-purple);
    }

    .context-menu-item:last-child {
      border-bottom: none;
    }

    .context-menu-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    @media (max-width: 768px) {
      .viewer-toolbar {
        padding: 0 8px;
      }
      
      .toggle-label {
        display: none;
      }
      
      .view-toggle {
        margin-right: 8px;
      }
    }
  `]
})
export class TaskViewerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  tasks: Task[] = [];
  currentView: ViewType = ViewType.WEEK;
  ViewType = ViewType; // Expose enum to template
  
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

  onTaskCreate(taskData: any): void {
    this.taskStorage.createTask(taskData).subscribe(() => {
      this.loadTasks();
    });
  }

  onTaskUpdate(taskData: any): void {
    this.taskStorage.updateTask(taskData).subscribe(() => {
      this.loadTasks();
    });
  }

  onTaskDelete(taskId: string): void {
    this.taskStorage.deleteTask(taskId).subscribe(() => {
      this.loadTasks();
    });
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
}
