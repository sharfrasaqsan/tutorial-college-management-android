export interface Student {
  id: string;
  name: string;
  schoolName: string;
  grade?: string;
  status: 'active' | 'inactive';
  parentName?: string;
  parentPhone?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  subjects?: string[];
  grades?: string[];
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
  subjectId: string;
  subject: string;
  gradeId: string;
  grade: string;
  teacherId: string;
  teacherName: string;
  schedules: ClassSchedule[];
  status: 'active' | 'inactive';
  monthlyFee: number;
  sessionsPerCycle: number;
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

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  amount: number;
  month: string;
  method: string;
  status: 'paid' | 'pending';
  createdAt: any;
}

export interface Salary {
  id: string;
  teacherId: string;
  teacherName: string;
  amount: number;
  netAmount: number;
  month: string;
  status: 'paid' | 'pending';
  createdAt: any;
  sessionsConducted?: number;
  className?: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  createdAt: any;
}
