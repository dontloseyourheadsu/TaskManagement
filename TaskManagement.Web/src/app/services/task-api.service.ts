import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Task, CreateTaskRequest, UpdateTaskRequest } from '../models/task.model';
import { TaskStorageService } from './task-storage.service';

export interface ApiTask {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  task_type: string;
  color: string;
  urgent: boolean;
  completed: boolean;
  due_date?: string;
  topic_id: string;
  recurrence_type?: 'daily' | 'weekly' | 'monthly';
  recurrence_interval?: number;
  recurrence_days?: number[];
  recurrence_end_date?: string;
  instance_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiCreateTaskRequest {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  task_type: string;
  color: string;
  urgent: boolean;
  completed: boolean;
  due_date?: string;
  topic_id: string;
  recurrence_type?: 'daily' | 'weekly' | 'monthly';
  recurrence_interval?: number;
  recurrence_days?: number[];
  recurrence_end_date?: string;
}

export interface ApiUpdateTaskRequest extends Partial<ApiCreateTaskRequest> {
  instance_date?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskApiService extends TaskStorageService {
  private readonly baseUrl = 'http://localhost:8000/api';
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  private workspaceId: string | null = null;

  constructor(private http: HttpClient) {
    super();
  }

  setWorkspaceId(workspaceId: string | null): void {
    this.workspaceId = workspaceId;
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // New method to support filtered queries
  getTasksWithFilters(filters: {
    taskTypes?: string[];
    completed?: boolean;
    urgent?: boolean;
    title?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    startDate?: Date;
    endDate?: Date;
    workspaceId?: string | null;
  }): Observable<Task[]> {
    let params = new HttpParams();

    const workspaceId = filters.workspaceId ?? this.workspaceId;
    if (workspaceId) {
      params = params.set('workspace_id', workspaceId);
    }

    // Add filter parameters
    if (filters.taskTypes && filters.taskTypes.length > 0) {
      params = params.set('task_type', filters.taskTypes.join(','));
    }
    if (filters.completed !== undefined) {
      params = params.set('completed', filters.completed.toString());
    }
    if (filters.urgent !== undefined) {
      params = params.set('urgent', filters.urgent.toString());
    }
    if (filters.title) {
      params = params.set('title', filters.title);
    }
    if (filters.startDate) {
      params = params.set('start_date', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      params = params.set('end_date', filters.endDate.toISOString());
    }
    
    // Add sorting parameters (OData-style)
    if (filters.sortField) {
      const orderBy = `${filters.sortField} ${filters.sortOrder || 'desc'}`;
      params = params.set('$orderby', orderBy);
    }

    return this.http.get<ApiTask[]>(`${this.baseUrl}/tasks`, {
      headers: this.getAuthHeaders(),
      params: params
    }).pipe(
      map(apiTasks => apiTasks.map(apiTask => this.convertApiTaskToTask(apiTask))),
      tap((tasks: Task[]) => this.tasksSubject.next(tasks)),
      catchError(error => {
        console.error('Error fetching filtered tasks:', error);
        return of([]);
      })
    );
  }

  private convertApiTaskToTask(apiTask: ApiTask): Task {
    return {
      id: apiTask.id,
      title: apiTask.title,
      description: apiTask.description,
      startTime: new Date(apiTask.start_time),
      endTime: new Date(apiTask.end_time),
      type: apiTask.task_type as any,
      color: apiTask.color,
      urgent: apiTask.urgent,
      completed: apiTask.completed,
      dueDate: apiTask.due_date ? new Date(apiTask.due_date) : undefined,
      topicId: apiTask.topic_id,
      recurrenceType: apiTask.recurrence_type,
      recurrenceInterval: apiTask.recurrence_interval,
      recurrenceDays: apiTask.recurrence_days,
      recurrenceEndDate: apiTask.recurrence_end_date ? new Date(apiTask.recurrence_end_date) : undefined,
      instanceDate: apiTask.instance_date
    };
  }

  private convertTaskToApiRequest(task: CreateTaskRequest | UpdateTaskRequest): ApiCreateTaskRequest | ApiUpdateTaskRequest {
    const apiRequest: any = {
      title: task.title,
      description: task.description,
      start_time: task.startTime?.toISOString(),
      end_time: task.endTime?.toISOString(),
      task_type: task.type,
      color: task.color,
      urgent: task.urgent,
      completed: task.completed,
      due_date: task.dueDate ? task.dueDate.toISOString() : undefined,
      topic_id: task.topicId,
      recurrence_type: task.recurrenceType,
      recurrence_interval: task.recurrenceInterval,
      recurrence_days: task.recurrenceDays,
      recurrence_end_date: task.recurrenceEndDate ? task.recurrenceEndDate.toISOString() : undefined,
      instance_date: (task as UpdateTaskRequest).instanceDate
    };

    return apiRequest;
  }

  getTasks(): Observable<Task[]> {
    let params = new HttpParams();
    if (this.workspaceId) {
      params = params.set('workspace_id', this.workspaceId);
    }

    return this.http.get<ApiTask[]>(`${this.baseUrl}/tasks`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(
      map(apiTasks => apiTasks.map(apiTask => this.convertApiTaskToTask(apiTask))),
      catchError(error => {
        console.error('Error fetching tasks:', error);
        return throwError(error);
      })
    );
  }

  getTasksForDateRange(startDate: Date, endDate: Date): Observable<Task[]> {
    const params = new HttpParams()
      .set('start_date', startDate.toISOString())
      .set('end_date', endDate.toISOString());

    const workspaceParams = this.workspaceId ? params.set('workspace_id', this.workspaceId) : params;

    return this.http.get<ApiTask[]>(`${this.baseUrl}/tasks`, {
      headers: this.getAuthHeaders(),
      params: workspaceParams
    }).pipe(
      map(apiTasks => apiTasks.map(apiTask => this.convertApiTaskToTask(apiTask))),
      catchError(error => {
        console.error('Error fetching tasks for date range:', error);
        return throwError(error);
      })
    );
  }

  createTask(taskRequest: CreateTaskRequest): Observable<Task> {
    const apiRequest = this.convertTaskToApiRequest(taskRequest);
    
    return this.http.post<ApiTask>(`${this.baseUrl}/tasks`, apiRequest, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      map(apiTask => this.convertApiTaskToTask(apiTask)),
      catchError(error => {
        console.error('Error creating task:', error);
        return throwError(error);
      })
    );
  }

  updateTask(taskRequest: UpdateTaskRequest): Observable<Task> {
    const apiRequest = this.convertTaskToApiRequest(taskRequest);
    
    return this.http.put<ApiTask>(`${this.baseUrl}/tasks/${taskRequest.id}`, apiRequest, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      map(apiTask => this.convertApiTaskToTask(apiTask)),
      catchError(error => {
        console.error('Error updating task:', error);
        return throwError(error);
      })
    );
  }

  deleteTask(taskId: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/tasks/${taskId}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => {
        console.error('Error deleting task:', error);
        return throwError(error);
      })
    );
  }
}
