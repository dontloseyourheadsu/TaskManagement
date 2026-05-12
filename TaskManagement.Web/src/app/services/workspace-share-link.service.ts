import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface WorkspaceShareLink {
  id: string;
  workspace_id: string;
  created_by: string;
  token: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
}

export interface CreateWorkspaceShareLinkRequest {
  expires_at?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class WorkspaceShareLinkService {
  private readonly baseUrl = 'http://localhost:8000/api/workspaces';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  listLinks(workspaceId: string): Observable<WorkspaceShareLink[]> {
    return this.http.get<WorkspaceShareLink[]>(`${this.baseUrl}/${workspaceId}/share-links`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error loading share links:', error);
        return throwError(error);
      })
    );
  }

  createLink(workspaceId: string, request: CreateWorkspaceShareLinkRequest): Observable<WorkspaceShareLink> {
    return this.http.post<WorkspaceShareLink>(`${this.baseUrl}/${workspaceId}/share-links`, request, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error creating share link:', error);
        return throwError(error);
      })
    );
  }

  revokeLink(workspaceId: string, shareLinkId: string): Observable<WorkspaceShareLink> {
    return this.http.delete<WorkspaceShareLink>(`${this.baseUrl}/${workspaceId}/share-links/${shareLinkId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error revoking share link:', error);
        return throwError(error);
      })
    );
  }
}
