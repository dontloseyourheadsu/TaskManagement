import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Task, TaskType } from '../models/task.model';
import { CalendarService } from '../services/calendar.service';

@Component({
  selector: 'app-kanban-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule
  ],
  template: `
    <div class="kanban-container">
      <div class="kanban-column" *ngFor="let column of columns">
        <div class="column-header">
          <h3>{{ column.label }}</h3>
          <span class="task-count">{{ getTasksForType(column.type).length }}</span>
        </div>
        
        <div class="column-content" 
             [style.background-color]="getColumnColor(column.type)">
          
          <div class="task-card" 
               *ngFor="let task of getTasksForType(column.type)"
               [style.background-color]="task.color"
               [class.completed]="task.completed"
               (click)="onTaskClick(task)"
               (contextmenu)="onTaskRightClick(task, $event)">
            
            <!-- Task header -->
            <div class="task-header">
              <span class="task-title" [class.completed-text]="task.completed">
                {{ task.title }}
              </span>
              
              <div class="task-indicators">
                <mat-icon class="urgent-indicator" *ngIf="task.urgent">
                  priority_high
                </mat-icon>
                <mat-checkbox 
                  [checked]="task.completed"
                  (change)="onCompletedChange(task, $event)"
                  (click)="$event.stopPropagation()"
                  class="completed-checkbox">
                </mat-checkbox>
              </div>
            </div>
            
            <!-- Task description -->
            <div class="task-description" *ngIf="task.description">
              {{ task.description }}
            </div>
            
            <!-- Task time -->
            <div class="task-time">
              <mat-icon>schedule</mat-icon>
              {{ calendarService.formatTime(task.startTime) }} - 
              {{ calendarService.formatTime(task.endTime) }}
            </div>
            
            <!-- Due date -->
            <div class="task-due-date" *ngIf="task.dueDate" 
                 [class.overdue]="isOverdue(task)">
              <mat-icon>event</mat-icon>
              Due: {{ formatDueDate(task.dueDate) }}
            </div>
          </div>
          
          <!-- Empty state -->
          <div class="empty-state" *ngIf="getTasksForType(column.type).length === 0">
            <mat-icon>inbox</mat-icon>
            <p>No {{ column.label.toLowerCase() }} tasks</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kanban-container {
      display: flex;
      gap: 16px;
      padding: 16px;
      overflow-x: auto;
      height: 100%;
    }

    .kanban-column {
      min-width: 300px;
      display: flex;
      flex-direction: column;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      background: var(--primary-purple);
      color: white;
      border-radius: 8px 8px 0 0;
    }

    .column-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .task-count {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .column-content {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      border-radius: 0 0 8px 8px;
    }

    .task-card {
      background: white;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      border-left: 4px solid;
      position: relative;
    }

    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .task-card.completed {
      opacity: 0.7;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .task-title {
      font-weight: 500;
      color: #333;
      flex: 1;
      margin-right: 8px;
    }

    .task-title.completed-text {
      text-decoration: line-through;
      opacity: 0.6;
    }

    .task-indicators {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .urgent-indicator {
      color: #f44336 !important;
      font-size: 16px !important;
      width: 16px !important;
      height: 16px !important;
    }

    .completed-checkbox {
      transform: scale(0.8);
    }

    .task-description {
      color: #666;
      font-size: 14px;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .task-time {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #777;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .task-time mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .task-due-date {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #777;
      font-size: 12px;
    }

    .task-due-date mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .task-due-date.overdue {
      color: #f44336;
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      color: #999;
      padding: 32px 16px;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #ddd;
      margin-bottom: 8px;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .kanban-container {
        flex-direction: column;
        padding: 8px;
      }
      
      .kanban-column {
        min-width: unset;
        width: 100%;
      }
    }
  `]
})
export class KanbanViewComponent {
  @Input() tasks: Task[] = [];
  @Output() taskClick = new EventEmitter<Task>();
  @Output() taskRightClick = new EventEmitter<{task: Task, event: MouseEvent}>();
  @Output() taskCompletedChange = new EventEmitter<{task: Task, completed: boolean}>();

  columns = [
    { type: TaskType.WORK, label: 'Work' },
    { type: TaskType.PERSONAL, label: 'Personal' },
    { type: TaskType.MEETING, label: 'Meeting' },
    { type: TaskType.DEADLINE, label: 'Deadline' },
    { type: TaskType.EVENT, label: 'Event' }
  ];

  constructor(public calendarService: CalendarService) {}

  getTasksForType(type: TaskType): Task[] {
    return this.tasks.filter(task => task.type === type);
  }

  getColumnColor(type: TaskType): string {
    const colors = {
      [TaskType.WORK]: '#f8f9ff',
      [TaskType.PERSONAL]: '#fff8f0',
      [TaskType.MEETING]: '#f0f8ff',
      [TaskType.DEADLINE]: '#fff0f0',
      [TaskType.EVENT]: '#f0fff8'
    };
    return colors[type] || '#f5f5f5';
  }

  onTaskClick(task: Task): void {
    this.taskClick.emit(task);
  }

  onTaskRightClick(task: Task, event: MouseEvent): void {
    event.preventDefault();
    this.taskRightClick.emit({ task, event });
  }

  onCompletedChange(task: Task, event: any): void {
    this.taskCompletedChange.emit({ task, completed: event.checked });
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today && !task.completed;
  }

  formatDueDate(date: Date): string {
    const today = new Date();
    const dueDate = new Date(date);
    
    if (this.calendarService.isSameDay(dueDate, today)) {
      return 'Today';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (this.calendarService.isSameDay(dueDate, tomorrow)) {
      return 'Tomorrow';
    }
    
    return dueDate.toLocaleDateString();
  }
}
