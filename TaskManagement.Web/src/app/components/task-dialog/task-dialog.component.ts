import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Task, TaskType, CreateTaskRequest, UpdateTaskRequest, Topic, TaskSubstep, CreateSubstepRequest, UpdateSubstepRequest } from '../../models/task.model';
import { TopicService } from '../../services/topic.service';
import { SubstepService } from '../../services/substep.service';

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
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatListModule,
    MatTooltipModule
  ],
  templateUrl: './task-dialog.component.html',
  styleUrls: ['./task-dialog.component.css']
})
export class TaskDialogComponent implements OnInit {
  taskForm!: FormGroup;
  topics: Topic[] = [];
  substeps: TaskSubstep[] = [];
  newSubstepDescription = '';
  isLoadingSubsteps = false;
  
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
    private topicService: TopicService,
    private substepService: SubstepService,
    private dialogRef: MatDialogRef<TaskDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskDialogData
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadTopics();
    if (this.data.task && this.data.mode === 'edit' && 'id' in this.data.task) {
      console.log('Debug: Task dialog ngOnInit - editing task with data:', {
        task: this.data.task,
        startTime: this.data.startTime,
        endTime: this.data.endTime
      });
      
      // Load substeps for existing tasks
      this.loadSubsteps(this.data.task.id);
    } else if (this.data.startTime && this.data.endTime) {
      console.log('Debug: Task dialog ngOnInit - creating task with time data:', {
        startTime: this.data.startTime,
        endTime: this.data.endTime
      });
    }
  }

  private loadTopics(): void {
    this.topicService.getTopics().subscribe({
      next: (topics) => {
        this.topics = topics;
        // Set default topic if creating new task
        if (this.data.mode === 'create' && topics.length > 0) {
          this.taskForm.patchValue({ topicId: topics[0].id });
        }
      },
      error: (error) => {
        console.error('Error loading topics:', error);
      }
    });
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
      topicId: ['', Validators.required],
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
      topicId: task.topicId,
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
        topicId: formValue.topicId,
        urgent: formValue.urgent,
        completed: formValue.completed,
        dueDate: formValue.dueDate
      };

      this.dialogRef.close(taskData);
    }
  }

  loadSubsteps(taskId: string): void {
    if (!taskId) return;
    
    this.isLoadingSubsteps = true;
    this.substepService.getSubsteps(taskId).subscribe({
      next: (substeps) => {
        this.substeps = substeps;
        this.isLoadingSubsteps = false;
      },
      error: (error) => {
        console.error('Error loading substeps:', error);
        this.isLoadingSubsteps = false;
      }
    });
  }

  addSubstep(): void {
    if (!this.newSubstepDescription.trim() || !this.data.task || !('id' in this.data.task)) {
      return;
    }

    const request: CreateSubstepRequest = {
      description: this.newSubstepDescription.trim()
    };

    this.substepService.createSubstep(this.data.task.id, request).subscribe({
      next: (substep) => {
        this.substeps.push(substep);
        this.newSubstepDescription = '';
      },
      error: (error) => {
        console.error('Error creating substep:', error);
      }
    });
  }

  toggleSubstepCompleted(substep: TaskSubstep): void {
    const request: UpdateSubstepRequest = {
      completed: !substep.completed
    };

    this.substepService.updateSubstep(substep.id, request).subscribe({
      next: (updatedSubstep) => {
        const index = this.substeps.findIndex(s => s.id === substep.id);
        if (index !== -1) {
          this.substeps[index] = updatedSubstep;
        }
      },
      error: (error) => {
        console.error('Error updating substep:', error);
      }
    });
  }

  deleteSubstep(substepId: string): void {
    this.substepService.deleteSubstep(substepId).subscribe({
      next: (success) => {
        if (success) {
          this.substeps = this.substeps.filter(s => s.id !== substepId);
        }
      },
      error: (error) => {
        console.error('Error deleting substep:', error);
      }
    });
  }

  trackBySubstep(index: number, substep: TaskSubstep): string {
    return substep.id;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
