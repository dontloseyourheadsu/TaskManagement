import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ThemeService, AppTheme } from './theme.service';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  theme: AppTheme;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:8000/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private themeService: ThemeService) {
    this.checkAuthState();
  }

  private checkAuthState(): void {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.getCurrentUser().subscribe({
        next: (user) => {
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
          this.themeService.initTheme(user.theme);
        },
        error: () => {
          this.logout();
          this.themeService.initTheme();
        }
      });
    } else {
      this.themeService.initTheme();
    }
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap(response => {
        localStorage.setItem('auth_token', response.token);
        this.currentUserSubject.next(response.user);
        this.isAuthenticatedSubject.next(true);
        this.themeService.setTheme(response.user.theme);
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(error);
      })
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, userData).pipe(
      tap(response => {
        localStorage.setItem('auth_token', response.token);
        this.currentUserSubject.next(response.user);
        this.isAuthenticatedSubject.next(true);
        this.themeService.setTheme(response.user.theme);
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(error);
      })
    );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      catchError(error => {
        console.error('Get current user error:', error);
        return throwError(error);
      })
    );
  }

  updateProfile(data: { theme?: string; username?: string; email?: string }): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/me`, data, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        if (data.theme) {
          this.themeService.setTheme(data.theme as AppTheme);
        }
      }),
      catchError(error => {
        console.error('Update profile error:', error);
        return throwError(error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }
}
