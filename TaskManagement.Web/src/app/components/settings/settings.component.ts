import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ThemeService, AppTheme } from '../../services/theme.service';

interface ThemeOption {
  id: AppTheme;
  label: string;
  primary: string;
  background: string;
  surface: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    RouterModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  currentUser: User | null = null;
  
  themes: ThemeOption[] = [
    {
      id: 'theme-purple-dark',
      label: 'Purple Dark',
      primary: '#9c27b0',
      background: '#121212',
      surface: '#1e1e1e'
    },
    {
      id: 'theme-indigo-light',
      label: 'Indigo Light',
      primary: '#3f51b5',
      background: '#f5f5f5',
      surface: '#ffffff'
    },
    {
      id: 'theme-sepia',
      label: 'Sepia',
      primary: '#795548',
      background: '#f4ecd8',
      surface: '#fdf6e3'
    },
    {
      id: 'theme-teal-dark',
      label: 'Teal Dark',
      primary: '#009688',
      background: '#002b36',
      surface: '#073642'
    }
  ];

  constructor(
    private authService: AuthService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  selectTheme(themeId: AppTheme): void {
    if (this.currentUser && this.currentUser.theme !== themeId) {
      this.authService.updateProfile({ theme: themeId }).subscribe({
        next: () => {
          console.log('Theme updated successfully');
        },
        error: (err) => {
          console.error('Failed to update theme:', err);
        }
      });
    } else if (!this.currentUser) {
      // For non-logged in users (if any), just apply locally
      this.themeService.setTheme(themeId);
    }
  }

  isActive(themeId: AppTheme): boolean {
    return this.themeService.getCurrentTheme() === themeId;
  }
}
