import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { TaskStorageService, LocalStorageTaskService } from '../services/task-storage.service';
import { CalendarService } from '../services/calendar.service';
import { Task, WeekView, CreateTaskRequest, UpdateTaskRequest } from '../models/task.model';
import { TaskDialogComponent, TaskDialogData } from './task-dialog.component';

interface TaskPosition {
  task: Task;
  top: number;
  height: number;
  left: number;
  width: number;
  overlaps: number;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatMenuModule
  ],
  providers: [
    { provide: TaskStorageService, useClass: LocalStorageTaskService }
  ],
  template: `
    <mat-toolbar>
      <span>Task Management Calendar</span>
      <span class="spacer"></span>
      <button mat-icon-button (click)="previousWeek()">
        <mat-icon>chevron_left</mat-icon>
      </button>
      <button mat-button (click)="goToToday()">Today</button>
      <button mat-icon-button (click)="nextWeek()">
        <mat-icon>chevron_right</mat-icon>
      </button>
    </mat-toolbar>

    <div class="calendar-container" #calendarContainer>
      <!-- Week header -->
      <div class="week-header">
        <div class="time-column-header"></div>
        <div class="day-header" *ngFor="let day of currentWeek.days; let i = index"
             [class.today]="calendarService.isToday(day)">
          <div class="day-name">{{ calendarService.formatDate(day) }}</div>
        </div>
      </div>

      <!-- Calendar grid -->
      <div class="calendar-grid" #calendarGrid>
        <!-- Time column -->
        <div class="time-column">
          <div class="time-slot-label" *ngFor="let slot of timeSlots">
            {{ slot.time }}
          </div>
        </div>

        <!-- Day columns -->
        <div class="days-container" 
             (mousedown)="onMouseDown($event)"
             (mousemove)="onMouseMove($event)"
             (mouseup)="onMouseUp($event)">
          <div class="day-column" 
               *ngFor="let day of currentWeek.days; let dayIndex = index"
               [attr.data-day-index]="dayIndex">
            
            <!-- Time slots -->
            <div class="time-slot" 
                 *ngFor="let slot of timeSlots; let slotIndex = index"
                 [attr.data-slot-index]="slotIndex">
            </div>

            <!-- Tasks -->
            <div class="task-item"
                 *ngFor="let taskPos of getTasksForDay(dayIndex)"
                 [style.top.px]="taskPos.top"
                 [style.height.px]="taskPos.height"
                 [style.left.px]="taskPos.left"
                 [style.width.px]="taskPos.width"
                 [style.background-color]="taskPos.task.color"
                 [style.border-left-color]="taskPos.task.color"
                 [class.overlapped]="taskPos.overlaps > 0"
                 (click)="onTaskClick(taskPos.task, $event)"
                 (contextmenu)="onTaskRightClick(taskPos.task, $event)">
              
              <div class="task-title">{{ taskPos.task.title }}</div>
              <div class="task-time">
                {{ calendarService.formatTime(taskPos.task.startTime) }} - 
                {{ calendarService.formatTime(taskPos.task.endTime) }}
              </div>
              
              <mat-icon class="urgent-indicator" *ngIf="taskPos.task.urgent">
                priority_high
              </mat-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- Selection indicator -->
      <div class="selection-indicator" 
           *ngIf="isSelecting"
           [style.top.px]="selectionRect.top"
           [style.left.px]="selectionRect.left"
           [style.width.px]="selectionRect.width"
           [style.height.px]="selectionRect.height">
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
      <div class="context-menu-item" (click)="deleteTask(contextMenu.task!)">
        <mat-icon>delete</mat-icon> Delete
      </div>
    </div>

    <!-- Add task button -->
    <button mat-raised-button color="primary" class="add-task-fab" (click)="openTaskDialog()">
      <mat-icon>add</mat-icon>
      New Task
    </button>
  `,
  styles: [`
    .spacer {
      flex: 1 1 auto;
    }

    .calendar-container {
      height: calc(100vh - 64px);
      overflow: auto;
      position: relative;
    }

    .week-header {
      display: flex;
      border-bottom: 2px solid #673ab7;
      background: white;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .time-column-header {
      width: 80px;
      min-width: 80px;
      border-right: 1px solid #e0e0e0;
    }

    .day-header {
      flex: 1;
      padding: 16px 8px;
      text-align: center;
      border-right: 1px solid #e0e0e0;
      font-weight: 500;
    }

    .day-header.today {
      background-color: var(--accent-purple);
      color: var(--primary-purple);
    }

    .calendar-grid {
      display: flex;
      position: relative;
    }

    .time-column {
      width: 80px;
      min-width: 80px;
      border-right: 1px solid #e0e0e0;
    }

    .time-slot-label {
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: var(--text-secondary);
      border-bottom: 1px solid #f0f0f0;
    }

    .days-container {
      flex: 1;
      display: flex;
      position: relative;
    }

    .day-column {
      flex: 1;
      border-right: 1px solid #e0e0e0;
      position: relative;
    }

    .time-slot {
      height: 30px;
      border-bottom: 1px solid #f0f0f0;
      cursor: crosshair;
    }

    .time-slot:hover {
      background-color: rgba(103, 58, 183, 0.05);
    }

    .task-item {
      position: absolute;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      border-left: 4px solid;
      font-size: 12px;
      line-height: 1.2;
      overflow: hidden;
      transition: opacity 0.2s, box-shadow 0.2s;
      color: white;
      min-height: 20px;
      z-index: 10;
    }

    .task-item.overlapped {
      opacity: 0.7;
    }

    .task-item:hover {
      opacity: 1 !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      z-index: 15;
    }

    .task-title {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-time {
      font-size: 10px;
      opacity: 0.9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .urgent-indicator {
      position: absolute;
      top: 2px;
      right: 2px;
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      color: #ffeb3b !important;
    }

    .selection-indicator {
      position: absolute;
      background: rgba(103, 58, 183, 0.2);
      border: 2px solid var(--primary-purple);
      border-radius: 4px;
      pointer-events: none;
      z-index: 5;
    }

    .context-menu {
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      min-width: 120px;
    }

    .context-menu-item {
      padding: 8px 16px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .context-menu-item:hover {
      background-color: var(--background-purple);
    }

    .context-menu-item:last-child {
      border-bottom: none;
    }

    .context-menu-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .add-task-fab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
    }

    @media (max-width: 768px) {
      .day-header {
        padding: 8px 4px;
        font-size: 12px;
      }
      
      .time-column-header,
      .time-column {
        width: 60px;
        min-width: 60px;
      }
      
      .time-slot-label {
        font-size: 10px;
      }
    }
  `]
})
export class CalendarComponent implements OnInit, OnDestroy {
  @ViewChild('calendarContainer', { static: true }) calendarContainer!: ElementRef;
  @ViewChild('calendarGrid', { static: true }) calendarGrid!: ElementRef;

  private destroy$ = new Subject<void>();
  
  currentWeek!: WeekView;
  tasks: Task[] = [];
  timeSlots: any[] = [];
  
  // Selection state
  isSelecting = false;
  selectionStart = { x: 0, y: 0, dayIndex: -1 };
  selectionRect = { top: 0, left: 0, width: 0, height: 0 };
  
  // Context menu state
  contextMenu = { visible: false, x: 0, y: 0, task: null as Task | null };

  constructor(
    public calendarService: CalendarService,
    private taskStorage: TaskStorageService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.timeSlots = this.calendarService.getTimeSlots();
    // Subscribe to current week changes
    this.calendarService.currentWeek$
      .pipe(takeUntil(this.destroy$))
      .subscribe(week => {
        this.currentWeek = week;
        this.loadTasksForCurrentWeek();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.contextMenu.visible) {
      this.contextMenu.visible = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.contextMenu.visible) {
      this.contextMenu.visible = false;
    }
  }

  private loadTasksForCurrentWeek(): void {
    this.taskStorage.getTasksForDateRange(this.currentWeek.startDate, this.currentWeek.endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe(tasks => {
        this.tasks = tasks;
      });
  }

  onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return; // Only left mouse button
    
    const target = event.target as HTMLElement;
    if (target.classList.contains('task-item')) return;
    
    const dayColumn = this.findDayColumn(target);
    if (!dayColumn) return;
    
    const dayIndex = parseInt(dayColumn.getAttribute('data-day-index') || '-1');
    if (dayIndex === -1) return;
    
    this.isSelecting = true;
    this.selectionStart = {
      x: event.clientX,
      y: event.clientY,
      dayIndex
    };
    
    this.updateSelectionRect(event);
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isSelecting) return;
    this.updateSelectionRect(event);
  }

  onMouseUp(event: MouseEvent): void {
    if (!this.isSelecting) return;
    
    this.isSelecting = false;
    
    // Calculate time range from selection
    const containerRect = this.calendarGrid.nativeElement.getBoundingClientRect();
    const startY = this.selectionStart.y - containerRect.top;
    const endY = event.clientY - containerRect.top;
    
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    
    const startTime = this.getTimeFromPosition(minY);
    const endTime = this.getTimeFromPosition(maxY);
    
    if (endTime > startTime) {
      const selectedDate = this.currentWeek.days[this.selectionStart.dayIndex];
      const startDateTime = new Date(selectedDate);
      startDateTime.setHours(Math.floor(startTime / 60), startTime % 60, 0, 0);
      
      const endDateTime = new Date(selectedDate);
      endDateTime.setHours(Math.floor(endTime / 60), endTime % 60, 0, 0);
      
      this.openTaskDialog(startDateTime, endDateTime);
    }
  }

  private findDayColumn(element: HTMLElement): HTMLElement | null {
    let current = element;
    while (current && !current.classList.contains('day-column')) {
      current = current.parentElement as HTMLElement;
      if (current === this.calendarContainer.nativeElement) return null;
    }
    return current;
  }

  private updateSelectionRect(event: MouseEvent): void {
    const containerRect = this.calendarGrid.nativeElement.getBoundingClientRect();
    const dayColumnWidth = containerRect.width / 7;
    
    const startX = 80 + (this.selectionStart.dayIndex * dayColumnWidth); // 80px for time column
    const startY = this.selectionStart.y - containerRect.top;
    const currentY = event.clientY - containerRect.top;
    
    this.selectionRect = {
      left: startX,
      top: Math.min(startY, currentY),
      width: dayColumnWidth - 1,
      height: Math.abs(currentY - startY)
    };
  }

  private getTimeFromPosition(y: number): number {
    const slotHeight = 30;
    const slotIndex = Math.floor(y / slotHeight);
    return Math.max(0, Math.min(slotIndex * 30, 24 * 60 - 30)); // 30-minute slots
  }

  getTasksForDay(dayIndex: number): TaskPosition[] {
    const day = this.currentWeek.days[dayIndex];
    const dayTasks = this.tasks.filter(task => 
      this.calendarService.isSameDay(new Date(task.startTime), day)
    );
    
    // Sort tasks by start time
    dayTasks.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    // Calculate positions and overlaps
    const positions: TaskPosition[] = [];
    const containerRect = this.calendarGrid?.nativeElement?.getBoundingClientRect();
    const dayColumnWidth = containerRect ? (containerRect.width / 7) : 200;
    
    dayTasks.forEach((task, index) => {
      const startTime = new Date(task.startTime);
      const endTime = new Date(task.endTime);
      
      const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      
      const top = (startMinutes / 30) * 30; // 30px per 30-minute slot
      const height = Math.max((durationMinutes / 30) * 30, 20); // Minimum 20px height
      
      // Calculate overlaps
      let overlaps = 0;
      let overlapIndex = 0;
      
      for (let i = 0; i < index; i++) {
        const otherTask = dayTasks[i];
        const otherStart = new Date(otherTask.startTime);
        const otherEnd = new Date(otherTask.endTime);
        
        if (startTime < otherEnd && endTime > otherStart) {
          overlaps++;
          if (overlapIndex === 0) {
            overlapIndex = overlaps;
          }
        }
      }
      
      const width = overlaps > 0 ? dayColumnWidth / (overlaps + 1) : dayColumnWidth - 2;
      const left = overlapIndex * width;
      
      positions.push({
        task,
        top,
        height,
        left,
        width,
        overlaps
      });
    });
    
    return positions;
  }

  onTaskClick(task: Task, event: MouseEvent): void {
    event.stopPropagation();
    this.editTask(task);
  }

  onTaskRightClick(task: Task, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.contextMenu = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      task
    };
  }

  openTaskDialog(startTime?: Date, endTime?: Date): void {
    const dialogData: TaskDialogData = {
      mode: 'create',
      startTime,
      endTime
    };

    const dialogRef = this.dialog.open(TaskDialogComponent, {
      width: '500px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskStorage.createTask(result).subscribe(() => {
          this.loadTasksForCurrentWeek();
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
          this.loadTasksForCurrentWeek();
        });
      }
    });
  }

  deleteTask(task: Task): void {
    this.contextMenu.visible = false;
    
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.taskStorage.deleteTask(task.id).subscribe(() => {
        this.loadTasksForCurrentWeek();
      });
    }
  }

  previousWeek(): void {
    this.calendarService.navigateWeek('previous');
  }

  nextWeek(): void {
    this.calendarService.navigateWeek('next');
  }

  goToToday(): void {
    this.calendarService.goToToday();
  }
}
