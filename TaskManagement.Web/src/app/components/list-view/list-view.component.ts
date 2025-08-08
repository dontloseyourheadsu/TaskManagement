import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule, MatCheckboxChange } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { Task, TaskType } from '../../models/task.model';
import { BehaviorSubject, Subject, debounceTime, takeUntil } from 'rxjs';

export interface FilterState {
  taskTypes: Set<TaskType>;
  completed: boolean | null;
  urgent: boolean | null;
  title: string;
  sortField: 'created_at' | 'start_time' | 'end_time' | 'title' | 'due_date';
  sortOrder: 'asc' | 'desc';
}

export interface FilterOption {
  key: string;
  label: string;
  values: { value: any; label: string; count: number; selected: boolean }[];
}

@Component({
  selector: 'app-list-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCheckboxModule,
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.css']
})
export class ListViewComponent implements OnInit, OnDestroy, OnChanges {
  @Input() tasks: Task[] = [];
  @Output() taskClick = new EventEmitter<Task>();
  @Output() taskRightClick = new EventEmitter<{task: Task, event: MouseEvent}>();
  @Output() taskCompletedChange = new EventEmitter<{task: Task, completed: boolean}>();
  @Output() filtersChange = new EventEmitter<FilterState>();

  @ViewChild('titleSearch') titleSearchRef!: ElementRef;

  private destroy$ = new Subject<void>();
  private titleSearchSubject = new BehaviorSubject<string>('');

  filteredTasks: Task[] = [];
  filterState: FilterState = {
    taskTypes: new Set<TaskType>(),
    completed: null,
    urgent: null,
    title: '',
    sortField: 'created_at',
    sortOrder: 'desc'
  };

  filterOptions: FilterOption[] = [];
  
  displayedColumns: string[] = [
    'completed', 
    'title', 
    'type', 
    'urgent', 
    'startTime', 
    'endTime', 
    'dueDate',
    'actions'
  ];

  TaskType = TaskType; // Expose to template

  ngOnInit() {
    // Set up title search debouncing
    this.titleSearchSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(title => {
      this.filterState.title = title;
      this.applyFilters();
      this.emitFilters();
    });

    this.updateFilterOptions();
    this.applyFilters();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges() {
    this.updateFilterOptions();
    this.applyFilters();
  }

  onTitleSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.titleSearchSubject.next(target.value);
  }

  clearTitleSearch() {
    this.titleSearchSubject.next('');
    if (this.titleSearchRef) {
      this.titleSearchRef.nativeElement.value = '';
    }
  }

  toggleTaskTypeFilter(taskType: TaskType) {
    if (this.filterState.taskTypes.has(taskType)) {
      this.filterState.taskTypes.delete(taskType);
    } else {
      this.filterState.taskTypes.add(taskType);
    }
    this.applyFilters();
    this.emitFilters();
  }

  setCompletedFilter(completed: boolean | null) {
    this.filterState.completed = completed;
    this.applyFilters();
    this.emitFilters();
  }

  setUrgentFilter(urgent: boolean | null) {
    this.filterState.urgent = urgent;
    this.applyFilters();
    this.emitFilters();
  }

  setSorting(field: FilterState['sortField']) {
    if (this.filterState.sortField === field) {
      // Toggle order if same field
      this.filterState.sortOrder = this.filterState.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.filterState.sortField = field;
      // Default to desc for dates, asc for text
      this.filterState.sortOrder = field === 'title' ? 'asc' : 'desc';
    }
    this.applyFilters();
    this.emitFilters();
  }

  getSortIcon(field: FilterState['sortField']): string {
    if (this.filterState.sortField !== field) {
      return 'unfold_more'; // No sorting applied
    }
    return this.filterState.sortOrder === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  }

  getSortTooltip(field: FilterState['sortField']): string {
    if (this.filterState.sortField !== field) {
      return `Click to sort by ${this.getFieldLabel(field)}`;
    }
    const order = this.filterState.sortOrder === 'asc' ? 'descending' : 'ascending';
    return `Currently sorted by ${this.getFieldLabel(field)} ${this.filterState.sortOrder === 'asc' ? 'ascending' : 'descending'}. Click for ${order}.`;
  }

  getFieldLabel(field: FilterState['sortField']): string {
    const labels: Record<FilterState['sortField'], string> = {
      'created_at': 'Date Created',
      'start_time': 'Start Time',
      'end_time': 'End Time', 
      'title': 'Title',
      'due_date': 'Due Date'
    };
    return labels[field];
  }

  clearAllFilters() {
    this.filterState = {
      taskTypes: new Set<TaskType>(),
      completed: null,
      urgent: null,
      title: '',
      sortField: 'created_at',
      sortOrder: 'desc'
    };
    
    if (this.titleSearchRef) {
      this.titleSearchRef.nativeElement.value = '';
    }
    
    this.titleSearchSubject.next('');
    this.applyFilters();
    this.emitFilters();
  }

  hasActiveFilters(): boolean {
    return this.filterState.taskTypes.size > 0 ||
           this.filterState.completed !== null ||
           this.filterState.urgent !== null ||
           this.filterState.title.length > 0;
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.filterState.taskTypes.size > 0) count++;
    if (this.filterState.completed !== null) count++;
    if (this.filterState.urgent !== null) count++;
    if (this.filterState.title.length > 0) count++;
    return count;
  }

  private updateFilterOptions() {
    this.filterOptions = [
      {
        key: 'taskTypes',
        label: 'Task Types',
        values: this.getTaskTypeOptions()
      },
      {
        key: 'completed',
        label: 'Status',
        values: this.getCompletedOptions()
      },
      {
        key: 'urgent',
        label: 'Priority',
        values: this.getUrgentOptions()
      }
    ];
  }

  private getTaskTypeOptions() {
    const typeCounts = new Map<TaskType, number>();
    
    // Count occurrences of each type
    this.tasks.forEach(task => {
      typeCounts.set(task.type, (typeCounts.get(task.type) || 0) + 1);
    });

    return Object.values(TaskType).map(type => ({
      value: type,
      label: this.getTaskTypeLabel(type),
      count: typeCounts.get(type) || 0,
      selected: this.filterState.taskTypes.has(type)
    }));
  }

  private getCompletedOptions() {
    const completedCount = this.tasks.filter(t => t.completed).length;
    const notCompletedCount = this.tasks.filter(t => !t.completed).length;

    return [
      {
        value: false,
        label: 'Pending',
        count: notCompletedCount,
        selected: this.filterState.completed === false
      },
      {
        value: true,
        label: 'Completed',
        count: completedCount,
        selected: this.filterState.completed === true
      }
    ];
  }

  private getUrgentOptions() {
    const urgentCount = this.tasks.filter(t => t.urgent).length;
    const notUrgentCount = this.tasks.filter(t => !t.urgent).length;

    return [
      {
        value: false,
        label: 'Normal',
        count: notUrgentCount,
        selected: this.filterState.urgent === false
      },
      {
        value: true,
        label: 'Urgent',
        count: urgentCount,
        selected: this.filterState.urgent === true
      }
    ];
  }

  private applyFilters() {
    this.filteredTasks = this.tasks.filter(task => {
      // Task type filter
      if (this.filterState.taskTypes.size > 0 && !this.filterState.taskTypes.has(task.type)) {
        return false;
      }

      // Completed filter
      if (this.filterState.completed !== null && task.completed !== this.filterState.completed) {
        return false;
      }

      // Urgent filter
      if (this.filterState.urgent !== null && task.urgent !== this.filterState.urgent) {
        return false;
      }

      // Title filter (case-insensitive partial match)
      if (this.filterState.title && 
          !task.title.toLowerCase().includes(this.filterState.title.toLowerCase()) &&
          (!task.description || !task.description.toLowerCase().includes(this.filterState.title.toLowerCase()))) {
        return false;
      }

      return true;
    });

    // Apply sorting
    this.filteredTasks.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (this.filterState.sortField) {
        case 'created_at':
          aValue = new Date(a.id); // Using ID as proxy for creation time
          bValue = new Date(b.id);
          break;
        case 'start_time':
          aValue = new Date(a.startTime);
          bValue = new Date(b.startTime);
          break;
        case 'end_time':
          aValue = new Date(a.endTime);
          bValue = new Date(b.endTime);
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'due_date':
          aValue = a.dueDate ? new Date(a.dueDate) : new Date(0);
          bValue = b.dueDate ? new Date(b.dueDate) : new Date(0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return this.filterState.sortOrder === 'asc' ? -1 : 1;
      } else if (aValue > bValue) {
        return this.filterState.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    // Update filter options to reflect new counts
    this.updateFilterOptions();
  }

  private emitFilters() {
    this.filtersChange.emit({ ...this.filterState });
  }

  // Event handlers
  onTaskClick(task: Task) {
    this.taskClick.emit(task);
  }

  onTaskRightClick(task: Task, event: MouseEvent) {
    event.preventDefault();
    this.taskRightClick.emit({ task, event });
  }

  onTaskCompletedToggle(task: Task, event: MatCheckboxChange) {
    this.taskCompletedChange.emit({ task, completed: event.checked });
  }

  // Utility methods for template
  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateShort(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  getTaskTypeColor(type: TaskType): string {
    const colors: Record<TaskType, string> = {
      [TaskType.WORK]: '#2196F3',
      [TaskType.PERSONAL]: '#4CAF50', 
      [TaskType.MEETING]: '#FF9800',
      [TaskType.DEADLINE]: '#F44336',
      [TaskType.EVENT]: '#9C27B0'
    };
    return colors[type];
  }

  getTaskTypeLabel(type: TaskType): string {
    const labels: Record<TaskType, string> = {
      [TaskType.WORK]: 'Work',
      [TaskType.PERSONAL]: 'Personal',
      [TaskType.MEETING]: 'Meeting',
      [TaskType.DEADLINE]: 'Deadline',
      [TaskType.EVENT]: 'Event'
    };
    return labels[type];
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date() && !task.completed;
  }

  getDaysUntilDue(task: Task): number {
    if (!task.dueDate) return 0;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
