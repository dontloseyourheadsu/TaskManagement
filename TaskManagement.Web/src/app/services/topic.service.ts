import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Topic } from '../models/task.model';

export interface CreateTopicRequest {
  name: string;
  description?: string;
  color: string;
}

export interface UpdateTopicRequest extends Partial<CreateTopicRequest> {}

@Injectable({
  providedIn: 'root'
})
export class TopicService {
  private readonly baseUrl = 'http://localhost:8000/api/topics';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getTopics(): Observable<Topic[]> {
    return this.http.get<Topic[]>(this.baseUrl, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => {
        console.error('Error fetching topics:', error);
        return throwError(error);
      })
    );
  }

  getTopic(topicId: string): Observable<Topic> {
    return this.http.get<Topic>(`${this.baseUrl}/${topicId}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => {
        console.error('Error fetching topic:', error);
        return throwError(error);
      })
    );
  }

  createTopic(topicRequest: CreateTopicRequest): Observable<Topic> {
    return this.http.post<Topic>(this.baseUrl, topicRequest, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => {
        console.error('Error creating topic:', error);
        return throwError(error);
      })
    );
  }

  updateTopic(topicId: string, topicRequest: UpdateTopicRequest): Observable<Topic> {
    return this.http.put<Topic>(`${this.baseUrl}/${topicId}`, topicRequest, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => {
        console.error('Error updating topic:', error);
        return throwError(error);
      })
    );
  }

  deleteTopic(topicId: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/${topicId}`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => {
        console.error('Error deleting topic:', error);
        return throwError(error);
      })
    );
  }
}
