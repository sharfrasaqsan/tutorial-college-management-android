import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";
import { db } from "./firebase";
import { processTeacherPayroll } from "./payroll";

export interface SessionCompletionResult {
  success: boolean;
  error?: string;
  alreadyMarked?: boolean;
}

/**
 * Marks an academic session as completed, handles atomic count updates,
 * and triggers automated payroll if cycles are reached.
 */
export async function completeAcademicSession(
  classItem: {
    id: string;
    name: string;
    subject: string;
    grade: string;
    startTime: string;
    room: string;
    studentCount: number;
    sessionsPerCycle?: number;
  },
  teacher: {
    id: string;
    name: string;
  }
): Promise<SessionCompletionResult> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = days[new Date().getDay()];
    
    // 1. Time-based Isolation check
    // We identifies a session by ClassID + Date + StartTime to allow multiple parallel sessions
    const startTimeSafe = (classItem.startTime || '00-00').replace(/:/g, '-');
    const completionId = `${classItem.id}_${todayStr}_${startTimeSafe}`;
    const completionRef = doc(db, "session_completions", completionId);
    
    const completionSnap = await getDoc(completionRef);
    if (completionSnap.exists()) {
      return { success: false, alreadyMarked: true, error: "Session protocol already finalized for today." };
    }

    // 2. Authorize Completion Record
    await setDoc(completionRef, {
      classId: classItem.id,
      className: classItem.name,
      teacherId: teacher.id,
      teacherName: teacher.name,
      date: todayStr,
      dayOfWeek: currentDay,
      timestamp: serverTimestamp(),
      subject: classItem.subject,
      grade: classItem.grade,
      startTime: classItem.startTime,
      room: classItem.room,
      studentCount: classItem.studentCount || 0,
      isPaid: false,
      day: new Date().getDate(),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    });

    // 3. Increment Counters (Atomic)
    const classRef = doc(db, "classes", classItem.id);
    await updateDoc(classRef, {
      completedSessions: increment(1),
      sessionsSinceLastPayment: increment(1)
    });

    // 4. Automated Payroll Assessment
    try {
      const qAll = query(collection(db, "classes"), where("teacherId", "==", teacher.id));
      const snap = await getDocs(qAll);
      const allClasses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const hasReachedMilestone = allClasses.some(c => 
          (c.sessionsSinceLastPayment || 0) >= (c.sessionsPerCycle || 8)
      );

      if (hasReachedMilestone) {
        await processTeacherPayroll(teacher.id, teacher.name, allClasses);
      }
    } catch (err) {
      console.error("Auto-payroll Assessment Failed:", err);
      // We don't fail the session completion if payroll check fails
    }

    return { success: true };
  } catch (error) {
    console.error("Protocol Sync Error:", error);
    return { success: false, error: "Cloud synchronization failed." };
  }
}
