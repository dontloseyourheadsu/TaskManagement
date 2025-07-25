import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CalendarComponent } from './components/calendar.component';

@Component({
  selector: 'app-root',
  imports: [CalendarComponent],
  template: '<app-calendar></app-calendar>',
  styleUrl: './app.css'
})
export class App {
  protected title = 'TaskManagement.Web';
}
