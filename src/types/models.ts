export interface Student {
  id: string;
  name: string;
  schoolName: string;
  grade?: string;
  status: 'active' | 'inactive';
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
}

export interface ClassSchedule {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
}

export interface Class {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacherId: string;
  teacherName: string;
  schedules: ClassSchedule[];
  status: 'active' | 'inactive';
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  className?: string;
  teacherId?: string;
  date: string;
  records: Record<string, boolean>;
  createdAt: any;
}
