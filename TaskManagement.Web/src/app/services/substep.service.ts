import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, throwError } from 'rxjs';
import { TaskSubstep, CreateSubstepRequest, UpdateSubstepRequest } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class SubstepService {
  private readonly baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  getSubsteps(taskId: string): Observable<TaskSubstep[]> {
    return this.http.get<TaskSubstep[]>(`${this.baseUrl}/tasks/${taskId}/substeps`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error fetching substeps:', error);
        return throwError(() => error);
      })
    );
  }

  createSubstep(taskId: string, request: CreateSubstepRequest): Observable<TaskSubstep> {
    return this.http.post<TaskSubstep>(`${this.baseUrl}/tasks/${taskId}/substeps`, request, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error creating substep:', error);
        return throwError(() => error);
      })
    );
  }

  updateSubstep(substepId: string, request: UpdateSubstepRequest): Observable<TaskSubstep> {
    return this.http.put<TaskSubstep>(`${this.baseUrl}/substeps/${substepId}`, request, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error updating substep:', error);
        return throwError(() => error);
      })
    );
  }

  deleteSubstep(substepId: string): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/substeps/${substepId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error deleting substep:', error);
        return throwError(() => error);
      })
    );
  }
}
