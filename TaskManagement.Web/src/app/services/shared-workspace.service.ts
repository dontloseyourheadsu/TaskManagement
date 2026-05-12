import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Task, Topic } from '../models/task.model';
import { Workspace } from './workspace.service';

interface ApiTask {
  id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
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
}

interface SharedWorkspaceApiResponse {
  workspace: Workspace;
  topics: Topic[];
  tasks: ApiTask[];
}

export interface SharedWorkspaceResponse {
  workspace: Workspace;
  topics: Topic[];
  tasks: Task[];
}

@Injectable({
  providedIn: 'root'
})
export class SharedWorkspaceService {
  private readonly baseUrl = 'http://localhost:8000/api/shared';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getSharedWorkspace(token: string): Observable<SharedWorkspaceResponse> {
    return this.http.get<SharedWorkspaceApiResponse>(`${this.baseUrl}/${token}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => ({
        workspace: response.workspace,
        topics: response.topics,
        tasks: response.tasks.map(task => this.mapApiTask(task))
      })),
      catchError(error => {
        console.error('Error loading shared workspace:', error);
        return throwError(error);
      })
    );
  }

  private mapApiTask(task: ApiTask): Task {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      startTime: task.start_time ? new Date(task.start_time) : undefined,
      endTime: task.end_time ? new Date(task.end_time) : undefined,
      type: task.task_type as any,
      color: task.color,
      urgent: task.urgent,
      completed: task.completed,
      dueDate: task.due_date ? new Date(task.due_date) : undefined,
      topicId: task.topic_id,
      recurrenceType: task.recurrence_type,
      recurrenceInterval: task.recurrence_interval,
      recurrenceDays: task.recurrence_days,
      recurrenceEndDate: task.recurrence_end_date ? new Date(task.recurrence_end_date) : undefined,
      instanceDate: task.instance_date
    };
  }
}
