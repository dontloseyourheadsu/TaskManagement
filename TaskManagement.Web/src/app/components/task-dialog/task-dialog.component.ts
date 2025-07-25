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
import { Task, TaskType, CreateTaskRequest, UpdateTaskRequest } from '../../models/task.model';

export interface TaskDialogData {
  task?: Task | CreateTaskRequest | UpdateTaskRequest;
  startTime?: Date;
  endTime?: Date;
  mode: 'create' | 'edit';
  isEdit?: boolean;
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
  templateUrl: './task-dialog.component.html',
  styleUrls: ['./task-dialog.component.css']
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
    if (this.data.task && this.data.mode === 'edit' && 'id' in this.data.task) {
      this.populateForm(this.data.task as Task);
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
