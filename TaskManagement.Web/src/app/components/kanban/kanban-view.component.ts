import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Task, TaskType } from '../../models/task.model';
import { CalendarService } from '../../services/calendar.service';

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
  templateUrl: './kanban-view.component.html',
  styleUrls: ['./kanban-view.component.css']
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
