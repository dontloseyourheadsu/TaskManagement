import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ThemeService, AppTheme } from '../../services/theme.service';
import { WorkspaceService, Workspace } from '../../services/workspace.service';
import { WorkspaceShareLinkService, WorkspaceShareLink } from '../../services/workspace-share-link.service';

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
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDividerModule,
    RouterModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  currentUser: User | null = null;
  workspaces: Workspace[] = [];
  selectedWorkspaceId: string | null = null;
  shareLinks: WorkspaceShareLink[] = [];
  isLoadingWorkspaces = false;
  isLoadingShareLinks = false;
  expiresInDays: number | null = 7;
  
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
    private themeService: ThemeService,
    private workspaceService: WorkspaceService,
    private workspaceShareLinkService: WorkspaceShareLinkService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user && this.workspaces.length > 0 && !this.selectedWorkspaceId) {
        this.selectedWorkspaceId = user.default_workspace_id || this.workspaces[0]?.id || null;
        this.loadShareLinks();
      }
    });

    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.isLoadingWorkspaces = true;

    this.workspaceService.getWorkspaces().subscribe({
      next: workspaces => {
        this.workspaces = workspaces;
        const cachedWorkspaceId = localStorage.getItem('workspace_id');
        const defaultWorkspaceId = this.currentUser?.default_workspace_id || null;
        this.selectedWorkspaceId = cachedWorkspaceId || defaultWorkspaceId || workspaces[0]?.id || null;
        this.loadShareLinks();
      },
      error: err => {
        console.error('Failed to load workspaces:', err);
      },
      complete: () => {
        this.isLoadingWorkspaces = false;
      }
    });
  }

  onWorkspaceChange(workspaceId: string | null): void {
    this.selectedWorkspaceId = workspaceId;
    if (workspaceId) {
      localStorage.setItem('workspace_id', workspaceId);
    } else {
      localStorage.removeItem('workspace_id');
    }
    this.loadShareLinks();
  }

  loadShareLinks(): void {
    if (!this.selectedWorkspaceId) {
      this.shareLinks = [];
      return;
    }

    this.isLoadingShareLinks = true;
    this.workspaceShareLinkService.listLinks(this.selectedWorkspaceId).subscribe({
      next: links => {
        this.shareLinks = links;
      },
      error: err => {
        console.error('Failed to load share links:', err);
      },
      complete: () => {
        this.isLoadingShareLinks = false;
      }
    });
  }

  createShareLink(): void {
    if (!this.selectedWorkspaceId) {
      return;
    }

    let expiresAt: string | null = null;
    if (this.expiresInDays !== null && this.expiresInDays > 0) {
      const date = new Date();
      date.setDate(date.getDate() + this.expiresInDays);
      expiresAt = date.toISOString();
    }

    this.workspaceShareLinkService
      .createLink(this.selectedWorkspaceId, { expires_at: expiresAt })
      .subscribe({
        next: link => {
          this.shareLinks = [link, ...this.shareLinks];
        },
        error: err => {
          console.error('Failed to create share link:', err);
        }
      });
  }

  revokeShareLink(link: WorkspaceShareLink): void {
    if (!this.selectedWorkspaceId) {
      return;
    }

    this.workspaceShareLinkService
      .revokeLink(this.selectedWorkspaceId, link.id)
      .subscribe({
        next: updated => {
          this.shareLinks = this.shareLinks.map(item => item.id === updated.id ? updated : item);
        },
        error: err => {
          console.error('Failed to revoke share link:', err);
        }
      });
  }

  getShareUrl(token: string): string {
    return `${window.location.origin}/shared/${token}`;
  }

  copyShareUrl(token: string): void {
    const url = this.getShareUrl(token);
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url).catch(err => {
        console.error('Failed to copy link:', err);
      });
    }
  }

  getShareStatus(link: WorkspaceShareLink): string {
    if (link.revoked_at) {
      return 'Revoked';
    }
    if (link.expires_at) {
      const expiresAt = new Date(link.expires_at).getTime();
      if (expiresAt <= Date.now()) {
        return 'Expired';
      }
    }
    return 'Active';
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
