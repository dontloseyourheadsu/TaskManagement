import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Task, CreateTaskRequest, UpdateTaskRequest } from '../models/task.model';

@Injectable()
export abstract class TaskStorageService {
  abstract getTasks(): Observable<Task[]>;
  abstract getTasksForDateRange(startDate: Date, endDate: Date): Observable<Task[]>;
  abstract createTask(task: CreateTaskRequest): Observable<Task>;
  abstract updateTask(task: UpdateTaskRequest): Observable<Task>;
  abstract deleteTask(taskId: string): Observable<boolean>;
}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageTaskService extends TaskStorageService {
  private readonly STORAGE_KEY = 'tasks';
  private tasksSubject = new BehaviorSubject<Task[]>([]);

  constructor() {
    super();
    this.loadTasksFromStorage();
  }

  getTasks(): Observable<Task[]> {
    return this.tasksSubject.asObservable();
  }

  getTasksForDateRange(startDate: Date, endDate: Date): Observable<Task[]> {
    const allTasks = this.tasksSubject.value;
    const filteredTasks = allTasks.filter(task => {
      const taskStart = new Date(task.startTime);
      const taskEnd = new Date(task.endTime);
      return (taskStart >= startDate && taskStart <= endDate) ||
             (taskEnd >= startDate && taskEnd <= endDate) ||
             (taskStart <= startDate && taskEnd >= endDate);
    });
    return new BehaviorSubject(filteredTasks).asObservable();
  }

  createTask(taskRequest: CreateTaskRequest): Observable<Task> {
    const task: Task = {
      id: this.generateId(),
      ...taskRequest
    };
    
    const currentTasks = this.tasksSubject.value;
    const updatedTasks = [...currentTasks, task];
    this.updateTasks(updatedTasks);
    
    return new BehaviorSubject(task).asObservable();
  }

  updateTask(taskRequest: UpdateTaskRequest): Observable<Task> {
    const currentTasks = this.tasksSubject.value;
    const taskIndex = currentTasks.findIndex(t => t.id === taskRequest.id);
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const updatedTask: Task = {
      ...currentTasks[taskIndex],
      ...taskRequest
    };

    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = updatedTask;
    this.updateTasks(updatedTasks);
    
    return new BehaviorSubject(updatedTask).asObservable();
  }

  deleteTask(taskId: string): Observable<boolean> {
    const currentTasks = this.tasksSubject.value;
    const filteredTasks = currentTasks.filter(t => t.id !== taskId);
    this.updateTasks(filteredTasks);
    
    return new BehaviorSubject(true).asObservable();
  }

  private loadTasksFromStorage(): void {
    try {
      const storedTasks = localStorage.getItem(this.STORAGE_KEY);
      if (storedTasks) {
        const tasks: Task[] = JSON.parse(storedTasks).map((task: any) => ({
          ...task,
          startTime: new Date(task.startTime),
          endTime: new Date(task.endTime)
        }));
        this.tasksSubject.next(tasks);
      }
    } catch (error) {
      console.error('Error loading tasks from storage:', error);
    }
  }

  private updateTasks(tasks: Task[]): void {
    this.tasksSubject.next(tasks);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to storage:', error);
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}
