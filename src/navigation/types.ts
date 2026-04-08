export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  MarkAttendance: { classId: string; className: string; grade: string; teacherId: string };
  Reports: undefined;
  Students: undefined;
  ManageClass: { classId?: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Timetable: undefined;
  AttendanceHistory: undefined;
  Profile: undefined;
};
