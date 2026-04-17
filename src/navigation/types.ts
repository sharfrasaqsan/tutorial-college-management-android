export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  MarkAttendance: { classId: string; className: string; grade: string; teacherId: string };
  Reports: undefined;
  Students: undefined;
  ManageClass: { classId?: string; teacherId?: string; teacherName?: string };
  AdminQRScanner: undefined;
  StudentProfile: { studentId: string };
  Finance: undefined;
  Teachers: undefined;
  ManageTeacher: { teacherId?: string };
  ClassSessions: { classId: string; className: string };
  ManageStudent: { studentId?: string };
  AddPayment: { studentId: string; studentName: string };
  RegistryManage: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Timetable: undefined;
  Salary: undefined;
  Profile: undefined;
};
