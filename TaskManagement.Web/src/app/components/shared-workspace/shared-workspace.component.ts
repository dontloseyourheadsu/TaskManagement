import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { SharedWorkspaceService, SharedWorkspaceResponse } from '../../services/shared-workspace.service';

@Component({
  selector: 'app-shared-workspace',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDividerModule
  ],
  templateUrl: './shared-workspace.component.html',
  styleUrls: ['./shared-workspace.component.css']
})
export class SharedWorkspaceComponent implements OnInit {
  isLoading = true;
  errorMessage = '';
  sharedData: SharedWorkspaceResponse | null = null;

  constructor(
    private route: ActivatedRoute,
    private sharedWorkspaceService: SharedWorkspaceService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.errorMessage = 'Missing share token.';
      this.isLoading = false;
      return;
    }

    this.sharedWorkspaceService.getSharedWorkspace(token).subscribe({
      next: data => {
        this.sharedData = data;
        this.isLoading = false;
      },
      error: err => {
        if (err?.status === 401) {
          this.errorMessage = 'Please sign in to view this shared workspace.';
        } else if (err?.status === 403) {
          this.errorMessage = 'This share link is expired or revoked.';
        } else {
          this.errorMessage = 'Unable to load the shared workspace.';
        }
        this.isLoading = false;
      }
    });
  }

  getTaskCountByTopic(topicId: string): number {
    if (!this.sharedData) {
      return 0;
    }
    return this.sharedData.tasks.filter(task => task.topicId === topicId).length;
  }
}
