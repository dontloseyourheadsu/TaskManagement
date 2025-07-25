import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Task, TaskType, CreateTaskRequest } from '../models/task.model';

export interface TaskDialogData {
  task?: Task;
  startTime?: Date;
  endTime?: Date;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-task-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create Task' : 'Edit Task' }}</h2>
    
    <mat-dialog-content>
      <form [formGroup]="taskForm" class="task-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Title *</mat-label>
          <input matInput formControlName="title" placeholder="Enter task title">
          <mat-error *ngIf="taskForm.get('title')?.hasError('required')">
            Title is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3" 
                   placeholder="Enter task description"></textarea>
        </mat-form-field>

        <div class="time-row">
          <mat-form-field appearance="outline">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startDatePicker" formControlName="startDate">
            <mat-datepicker-toggle matSuffix [for]="startDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #startDatePicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Start Time</mat-label>
            <input matInput type="time" formControlName="startTime">
          </mat-form-field>
        </div>

        <div class="time-row">
          <mat-form-field appearance="outline">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endDatePicker" formControlName="endDate">
            <mat-datepicker-toggle matSuffix [for]="endDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #endDatePicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>End Time</mat-label>
            <input matInput type="time" formControlName="endTime">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Type</mat-label>
          <mat-select formControlName="type">
            <mat-option *ngFor="let type of taskTypes" [value]="type.value">
              {{ type.label }}
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Color</mat-label>
          <mat-select formControlName="color">
            <mat-option *ngFor="let color of colorOptions" [value]="color.value">
              <div class="color-option">
                <div class="color-preview" [style.background-color]="color.value"></div>
                {{ color.label }}
              </div>
            </mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Due Date</mat-label>
          <input matInput [matDatepicker]="dueDatePicker" formControlName="dueDate">
          <mat-datepicker-toggle matSuffix [for]="dueDatePicker"></mat-datepicker-toggle>
          <mat-datepicker #dueDatePicker></mat-datepicker>
        </mat-form-field>

        <div class="checkbox-row">
          <mat-checkbox formControlName="urgent" class="checkbox-item">
            Mark as urgent
          </mat-checkbox>
          
          <mat-checkbox formControlName="completed" class="checkbox-item">
            Mark as completed
          </mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              [disabled]="!taskForm.valid"
              (click)="onSave()">
        {{ data.mode === 'create' ? 'Create' : 'Update' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .task-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
    }

    .full-width {
      width: 100%;
    }

    .time-row {
      display: flex;
      gap: 16px;
    }

    .time-row mat-form-field {
      flex: 1;
    }

    .color-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .color-preview {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #ccc;
    }

    .urgent-checkbox {
      margin-top: 8px;
    }

    .checkbox-row {
      display: flex;
      gap: 16px;
      margin-top: 8px;
    }

    .checkbox-item {
      flex: 1;
    }

    mat-dialog-content {
      padding: 20px;
    }

    mat-dialog-actions {
      padding: 16px 20px;
    }
  `]
})
export class TaskDialogComponent implements OnInit {
  taskForm!: FormGroup;
  
  taskTypes = [
    { value: TaskType.WORK, label: 'Work' },
    { value: TaskType.PERSONAL, label: 'Personal' },
    { value: TaskType.MEETING, label: 'Meeting' },
    { value: TaskType.DEADLINE, label: 'Deadline' },
    { value: TaskType.EVENT, label: 'Event' }
  ];

  colorOptions = [
    { value: '#673ab7', label: 'Purple' },
    { value: '#3f51b5', label: 'Indigo' },
    { value: '#2196f3', label: 'Blue' },
    { value: '#009688', label: 'Teal' },
    { value: '#4caf50', label: 'Green' },
    { value: '#ff9800', label: 'Orange' },
    { value: '#f44336', label: 'Red' },
    { value: '#e91e63', label: 'Pink' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TaskDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskDialogData
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.data.task && this.data.mode === 'edit') {
      this.populateForm(this.data.task);
    } else if (this.data.startTime && this.data.endTime) {
      this.setDefaultTimes(this.data.startTime, this.data.endTime);
    }
  }

  private initializeForm(): void {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      startDate: [new Date(), Validators.required],
      startTime: ['', Validators.required],
      endDate: [new Date(), Validators.required],
      endTime: ['', Validators.required],
      type: [TaskType.WORK, Validators.required],
      color: ['#673ab7', Validators.required],
      dueDate: [null],
      urgent: [false],
      completed: [false]
    });
  }

  private populateForm(task: Task): void {
    const startDate = new Date(task.startTime);
    const endDate = new Date(task.endTime);

    this.taskForm.patchValue({
      title: task.title,
      description: task.description || '',
      startDate: startDate,
      startTime: this.formatTimeForInput(startDate),
      endDate: endDate,
      endTime: this.formatTimeForInput(endDate),
      type: task.type,
      color: task.color,
      urgent: task.urgent,
      completed: task.completed,
      dueDate: task.dueDate || null
    });
  }

  private setDefaultTimes(startTime: Date, endTime: Date): void {
    this.taskForm.patchValue({
      startDate: startTime,
      startTime: this.formatTimeForInput(startTime),
      endDate: endTime,
      endTime: this.formatTimeForInput(endTime)
    });
  }

  private formatTimeForInput(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  private combineDateTime(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  onSave(): void {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      
      const taskData: CreateTaskRequest = {
        title: formValue.title,
        description: formValue.description,
        startTime: this.combineDateTime(formValue.startDate, formValue.startTime),
        endTime: this.combineDateTime(formValue.endDate, formValue.endTime),
        type: formValue.type,
        color: formValue.color,
        urgent: formValue.urgent,
        completed: formValue.completed,
        dueDate: formValue.dueDate
      };

      this.dialogRef.close(taskData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
