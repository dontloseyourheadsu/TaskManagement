export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  type: TaskType;
  color: string;
  urgent: boolean;
  userId?: string;
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
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: string;
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
