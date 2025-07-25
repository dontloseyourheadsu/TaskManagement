import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WeekView, TimeSlot } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private currentWeekSubject = new BehaviorSubject<WeekView>(this.getCurrentWeek());
  
  currentWeek$ = this.currentWeekSubject.asObservable();

  private timeSlots: TimeSlot[] = [];

  constructor() {
    this.generateTimeSlots();
  }

  getCurrentWeek(): WeekView {
    const today = new Date();
    const startOfWeek = this.getStartOfWeek(today);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return {
      startDate: startOfWeek,
      endDate: endOfWeek,
      days
    };
  }

  navigateWeek(direction: 'previous' | 'next'): void {
    const currentWeek = this.currentWeekSubject.value;
    const newStartDate = new Date(currentWeek.startDate);
    
    if (direction === 'previous') {
      newStartDate.setDate(newStartDate.getDate() - 7);
    } else {
      newStartDate.setDate(newStartDate.getDate() + 7);
    }

    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newStartDate.getDate() + 6);
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(newStartDate);
      day.setDate(newStartDate.getDate() + i);
      days.push(day);
    }

    const newWeek: WeekView = {
      startDate: newStartDate,
      endDate: newEndDate,
      days
    };

    this.currentWeekSubject.next(newWeek);
  }

  goToToday(): void {
    this.currentWeekSubject.next(this.getCurrentWeek());
  }

  getTimeSlots(): TimeSlot[] {
    return this.timeSlots;
  }

  getTimeSlotFromPosition(dayIndex: number, yPosition: number, containerHeight: number): { date: Date, time: Date } {
    const currentWeek = this.currentWeekSubject.value;
    const selectedDate = new Date(currentWeek.days[dayIndex]);
    
    // Calculate which 30-minute slot was clicked
    const totalMinutesInDay = 24 * 60;
    const slotSizeInMinutes = 30;
    const slotsPerDay = totalMinutesInDay / slotSizeInMinutes;
    
    const slotIndex = Math.floor((yPosition / containerHeight) * slotsPerDay);
    const minutes = slotIndex * slotSizeInMinutes;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    const time = new Date(selectedDate);
    time.setHours(hours, mins, 0, 0);
    
    return {
      date: selectedDate,
      time: time
    };
  }

  private getStartOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  private generateTimeSlots(): void {
    this.timeSlots = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        this.timeSlots.push({
          time: timeString,
          hour,
          minute
        });
      }
    }
  }

  formatDate(date: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }
}
