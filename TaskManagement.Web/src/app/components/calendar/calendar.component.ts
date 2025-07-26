import { Component, OnInit, OnDestroy, OnChanges, HostListener, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subject, takeUntil, combineLatest } from 'rxjs';
import { TaskStorageService, LocalStorageTaskService } from '../../services/task-storage.service';
import { CalendarService } from '../../services/calendar.service';
import { Task, WeekView, CreateTaskRequest, UpdateTaskRequest } from '../../models/task.model';
import { TaskDialogComponent, TaskDialogData } from '../task-dialog/task-dialog.component';

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
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatMenuModule,
    MatCheckboxModule
  ],
  providers: [
    { provide: TaskStorageService, useClass: LocalStorageTaskService }
  ],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit, OnDestroy, OnChanges {
  @Input() tasks: Task[] = [];
  @Output() taskCreated = new EventEmitter<Task>();
  @Output() taskUpdated = new EventEmitter<Task>();
  @Output() taskDeleted = new EventEmitter<string>();

  private destroy$ = new Subject<void>();
  
  weekView: WeekView = {
    startDate: new Date(),
    endDate: new Date(),
    days: []
  };
  
  weekDays: any[] = [];
  visibleTasks: (Task & { isOverlapped?: boolean })[] = [];
  timeSlots: { time: Date, label: string }[] = [];
  
  // Mouse interaction state
  private isSelecting = false;
  private startCell: { dayIndex: number, slotIndex: number } | null = null;
  private endCell: { dayIndex: number, slotIndex: number } | null = null;
  selectionRect: { left: number, top: number, width: number, height: number } | null = null;
  
  // Context menu state
  contextMenu = {
    visible: false,
    x: 0,
    y: 0,
    task: null as Task | null
  };

  constructor(
    private taskService: TaskStorageService,
    private calendarService: CalendarService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.generateTimeSlots();
    this.updateWeekView();
    
    // Subscribe to calendar service changes
    this.calendarService.currentWeek$
      .pipe(takeUntil(this.destroy$))
      .subscribe(weekView => {
        this.weekView = weekView;
        this.weekDays = weekView.days.map(day => ({
          format: (format: string) => {
            if (format === 'ddd') {
              const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              return days[day.getDay()];
            }
            if (format === 'M/D') {
              return `${day.getMonth() + 1}/${day.getDate()}`;
            }
            if (format === 'YYYY-MM-DD') {
              return day.toISOString().split('T')[0];
            }
            return day.toString();
          },
          clone: () => ({
            hour: (h: number) => ({
              minute: (m: number) => ({
                toDate: () => {
                  const newDate = new Date(day);
                  newDate.setHours(h, m, 0, 0);
                  return newDate;
                }
              })
            })
          })
        }));
        this.updateTasksFromInput();
      });

    // Watch for input changes
    this.updateTasksFromInput();
  }

  ngOnChanges() {
    this.updateTasksFromInput();
  }

  private updateTasksFromInput() {
    if (this.tasks) {
      this.visibleTasks = this.calculateTaskOverlaps(this.tasks);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private generateTimeSlots() {
    this.timeSlots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        this.timeSlots.push({
          time,
          label: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        });
      }
    }
  }

  private updateWeekView() {
    // The calendar service automatically manages current week
  }

  private calculateTaskOverlaps(tasks: Task[]): (Task & { isOverlapped?: boolean })[] {
    const tasksWithOverlap = tasks.map(task => ({ ...task, isOverlapped: false }));
    
    for (let i = 0; i < tasksWithOverlap.length; i++) {
      for (let j = i + 1; j < tasksWithOverlap.length; j++) {
        const task1 = tasksWithOverlap[i];
        const task2 = tasksWithOverlap[j];
        
        if (this.tasksOverlap(task1, task2)) {
          task1.isOverlapped = true;
          task2.isOverlapped = true;
        }
      }
    }
    
    return tasksWithOverlap;
  }

  private tasksOverlap(task1: Task, task2: Task): boolean {
    return task1.startTime < task2.endTime && task2.startTime < task1.endTime;
  }

  getTaskPosition(task: Task): any {
    const dayIndex = this.weekDays.findIndex(day => 
      day.format('YYYY-MM-DD') === new Date(task.startTime).toISOString().split('T')[0]
    );
    
    if (dayIndex === -1) return { display: 'none' };
    
    const startTime = new Date(task.startTime);
    const endTime = new Date(task.endTime);
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    const duration = endMinutes - startMinutes;
    
    const slotHeight = 30;
    const minutesPerSlot = 30;
    
    const top = (startMinutes / minutesPerSlot) * slotHeight;
    const height = Math.max((duration / minutesPerSlot) * slotHeight, 20);
    
    const dayWidth = 100 / this.weekDays.length;
    const left = (dayIndex * dayWidth) + '%';
    const width = dayWidth + '%';
    
    return {
      position: 'absolute',
      top: top + 'px',
      height: height + 'px',
      left: left,
      width: width,
      backgroundColor: task.color || '#673ab7',
      borderLeftColor: task.color || '#673ab7'
    };
  }

  trackByDay(index: number, day: any): string {
    return day.format('YYYY-MM-DD');
  }

  trackByTask(index: number, task: Task): string {
    return task.id;
  }

  isToday(day: any): boolean {
    const today = new Date();
    return day.format('YYYY-MM-DD') === today.toISOString().split('T')[0];
  }

  formatTime(dateTime: Date): string {
    return new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString();
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today && !task.completed;
  }

  onMouseDown(event: MouseEvent) {
    if (event.button !== 0) return; // Only left mouse button
    
    const target = event.target as HTMLElement;
    const timeSlot = target.closest('.time-slot') as HTMLElement;
    const dayColumn = target.closest('.day-column') as HTMLElement;
    
    if (timeSlot && dayColumn) {
      this.isSelecting = true;
      const dayIndex = parseInt(dayColumn.getAttribute('data-day-index') || '0');
      const slotIndex = parseInt(timeSlot.getAttribute('data-slot-index') || '0');
      
      this.startCell = { dayIndex, slotIndex };
      this.endCell = { dayIndex, slotIndex };
      this.updateSelectionRect();
      
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isSelecting || !this.startCell) return;
    
    const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement;
    const timeSlot = target?.closest('.time-slot') as HTMLElement;
    const dayColumn = target?.closest('.day-column') as HTMLElement;
    
    if (timeSlot && dayColumn) {
      const dayIndex = parseInt(dayColumn.getAttribute('data-day-index') || '0');
      const slotIndex = parseInt(timeSlot.getAttribute('data-slot-index') || '0');
      
      this.endCell = { dayIndex, slotIndex };
      this.updateSelectionRect();
    }
  }

  onMouseUp(event: MouseEvent) {
    if (this.isSelecting && this.startCell && this.endCell) {
      this.createTaskFromSelection();
    }
    this.clearSelection();
  }

  onMouseLeave() {
    this.clearSelection();
  }

  private updateSelectionRect() {
    if (!this.startCell || !this.endCell) return;
    
    const container = document.querySelector('.days-container') as HTMLElement;
    if (!container) return;
    
    const dayWidth = container.offsetWidth / this.weekDays.length;
    const slotHeight = 30;
    
    const startDay = Math.min(this.startCell.dayIndex, this.endCell.dayIndex);
    const endDay = Math.max(this.startCell.dayIndex, this.endCell.dayIndex);
    const startSlot = Math.min(this.startCell.slotIndex, this.endCell.slotIndex);
    const endSlot = Math.max(this.startCell.slotIndex, this.endCell.slotIndex);
    
    this.selectionRect = {
      left: startDay * dayWidth,
      top: startSlot * slotHeight,
      width: (endDay - startDay + 1) * dayWidth,
      height: (endSlot - startSlot + 1) * slotHeight
    };
  }

  private clearSelection() {
    this.isSelecting = false;
    this.startCell = null;
    this.endCell = null;
    this.selectionRect = null;
  }

  private createTaskFromSelection() {
    if (!this.startCell || !this.endCell) return;
    
    const startDay = Math.min(this.startCell.dayIndex, this.endCell.dayIndex);
    const startSlot = Math.min(this.startCell.slotIndex, this.endCell.slotIndex);
    const endSlot = Math.max(this.startCell.slotIndex, this.endCell.slotIndex);
    
    const selectedDay = this.weekDays[startDay];
    const startTime = selectedDay.clone().hour(Math.floor(startSlot / 2)).minute((startSlot % 2) * 30);
    const endTime = selectedDay.clone().hour(Math.floor((endSlot + 1) / 2)).minute(((endSlot + 1) % 2) * 30);
    
    this.openTaskDialog({
      startTime: startTime.toDate(),
      endTime: endTime.toDate()
    });
  }

  openTaskDialog(initialData?: Partial<CreateTaskRequest>) {
    const dialogRef = this.dialog.open<TaskDialogComponent, TaskDialogData>(TaskDialogComponent, {
      width: '500px',
      data: {
        task: initialData as CreateTaskRequest,
        mode: 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskService.createTask(result).subscribe(task => {
          this.taskCreated.emit(task);
        });
      }
    });
  }

  selectTask(task: Task, event: MouseEvent) {
    event.stopPropagation();
    // Handle task selection if needed
  }

  editTask(task: Task) {
    this.hideContextMenu();
    
    const dialogRef = this.dialog.open<TaskDialogComponent, TaskDialogData>(TaskDialogComponent, {
      width: '500px',
      data: {
        task: { ...task } as UpdateTaskRequest,
        mode: 'edit'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const updateRequest: UpdateTaskRequest = {
          id: task.id,
          ...result
        };
        this.taskService.updateTask(updateRequest).subscribe(updatedTask => {
          this.taskUpdated.emit(updatedTask);
        });
      }
    });
  }

  deleteTask(task: Task) {
    this.hideContextMenu();
    
    if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
      this.taskService.deleteTask(task.id).subscribe(() => {
        this.taskDeleted.emit(task.id);
      });
    }
  }

  toggleTaskCompletion(task: Task, event: any) {
    const completed = event.checked;
    const updateRequest: UpdateTaskRequest = {
      id: task.id,
      completed
    };
    this.taskService.updateTask(updateRequest).subscribe(updatedTask => {
      this.taskUpdated.emit(updatedTask);
    });
  }

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    this.hideContextMenu();
  }

  onTaskRightClick(event: MouseEvent, task: Task) {
    event.preventDefault();
    event.stopPropagation();
    
    this.contextMenu = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      task: task
    };
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.hideContextMenu();
  }

  private hideContextMenu() {
    this.contextMenu.visible = false;
  }

  previousWeek() {
    this.calendarService.navigateWeek('previous');
  }

  nextWeek() {
    this.calendarService.navigateWeek('next');
  }

  goToToday() {
    this.calendarService.goToToday();
  }
}
