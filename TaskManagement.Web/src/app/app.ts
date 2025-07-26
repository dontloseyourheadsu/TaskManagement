import { Component } from '@angular/core';
import { TaskViewerComponent } from './components/task-viewer/task-viewer.component';

@Component({
  selector: 'app-root',
  imports: [TaskViewerComponent],
  template: '<app-task-viewer></app-task-viewer>',
  styleUrl: './app.css'
})
export class App {
  protected title = 'TaskManagement.Web';
}
