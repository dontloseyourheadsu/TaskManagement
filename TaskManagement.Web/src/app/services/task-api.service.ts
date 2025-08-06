import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
}

export interface ApiUpdateTaskRequest extends Partial<ApiCreateTaskRequest> {}

@Injectable({
  providedIn: 'root'
})
export class TaskApiService extends TaskStorageService {
  private readonly baseUrl = 'http://localhost:8000/api';
  private tasksSubject = new BehaviorSubject<Task[]>([]);

  constructor(private http: HttpClient) {
    super();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
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
      topicId: apiTask.topic_id
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
      topic_id: task.topicId || 'default-topic-id' // We'll need to handle topic selection
    };

    return apiRequest;
  }

  getTasks(): Observable<Task[]> {
    return this.http.get<ApiTask[]>(`${this.baseUrl}/tasks`, { 
      headers: this.getAuthHeaders() 
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

    return this.http.get<ApiTask[]>(`${this.baseUrl}/tasks`, { 
      headers: this.getAuthHeaders(),
      params 
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
