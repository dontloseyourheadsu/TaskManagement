export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: TaskType;
  color: string;
  urgent: boolean;
  completed: boolean;
  dueDate?: Date;
  topicId: string;
}

export enum TaskType {
  WORK = 'work',
  PERSONAL = 'personal',
  MEETING = 'meeting',
  DEADLINE = 'deadline',
  EVENT = 'event'
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: TaskType;
  color: string;
  urgent: boolean;
  completed: boolean;
  dueDate?: Date;
  topicId: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface WeekView {
  startDate: Date;
  endDate: Date;
  days: Date[];
}

export interface TimeSlot {
  time: string;
  hour: number;
  minute: number;
}

export enum ViewType {
  WEEK = 'week',
  KANBAN = 'kanban',
  LIST = 'list'
}

export interface ViewOption {
  type: ViewType;
  label: string;
  icon: string;
}
