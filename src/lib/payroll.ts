import { collection, doc, writeBatch, serverTimestamp, query, where, getDocs, increment } from "firebase/firestore";
import { db } from "./firebase";

export interface TeacherPayrollResult {
    success: boolean;
    salaryId?: string;
    error?: string;
}

/**
 * Automatically or manually processes payroll for a teacher based on their current pending sessions.
 * Resets the sessionsSinceLastPayment counter for all processed classes.
 */
export async function processTeacherPayroll(
    teacherId: string, 
    teacherName: string, 
    classes: any[],
    month: string = new Date().toISOString().substring(0, 7)
): Promise<TeacherPayrollResult> {
    const batch = writeBatch(db);
    
    try {
        const pendingClasses = classes.filter(c => (c.sessionsSinceLastPayment || 0) > 0);
        
        if (pendingClasses.length === 0) {
            return { success: false, error: "No pending sessions to process." };
        }

        const breakdown = pendingClasses.map(cls => {
            const studentCount = cls.studentCount || 0;
            const monthlyFee = cls.monthlyFee || 0;
            const sessionsConducted = cls.sessionsSinceLastPayment || 0;
            const totalMonthlyRevenue = studentCount * monthlyFee;
            const cycleValue = cls.sessionsPerCycle || 8;
            const perSessionRate = totalMonthlyRevenue / cycleValue;
            const finalPayout = Math.round(perSessionRate * sessionsConducted);

            return {
                classId: cls.id,
                className: cls.name,
                monthlyFee,
                studentCount,
                totalMonthlyRevenue,
                sessionsConducted,
                perSessionRate,
                finalPayout,
                sessionsPerCycle: cycleValue
            };
        });

        const totalNet = breakdown.reduce((sum, item) => sum + item.finalPayout, 0);
        const salaryRef = doc(collection(db, "salaries"));
        
        const salaryDoc = {
            teacherId,
            teacherName,
            month,
            status: "pending",
            basicAmount: totalNet,
            netAmount: totalNet,
            breakdown,
            createdAt: serverTimestamp(),
            processedAt: serverTimestamp(),
            paymentMethod: "Bank Transfer",
            type: "automatic"
        };

        // 1. Create the salary record
        batch.set(salaryRef, salaryDoc);

        // 2. Reset sessionsSinceLastPayment for all processed classes
        pendingClasses.forEach(cls => {
            batch.update(doc(db, "classes", cls.id), {
                sessionsSinceLastPayment: 0
            });
        });

        await batch.commit();
        return { success: true, salaryId: salaryRef.id };
    } catch (error) {
        console.error("Payroll processing error:", error);
        return { success: false, error: "Failed to process payroll batch." };
    }
}

/**
 * Authorizes a salary disbursement and atomically decrements class session counts.
 * This is the critical "Finalization Protocol" for administrative payroll.
 */
export async function disburseSalaryPayment(
    salaryId: string,
    breakdown: any[]
): Promise<{ success: boolean; error?: string }> {
    const batch = writeBatch(db);
    try {
        // 1. Mark Salary as Paid
        const salaryRef = doc(db, "salaries", salaryId);
        batch.update(salaryRef, {
            status: 'paid',
            paidAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // 2. Decrement session counts for all classes in this disbursement
        // NOTE: We don't reset to 0 because the teacher might have conducted 
        // new sessions while this salary was pending. We decrement the exact amount processed.
        breakdown.forEach(item => {
            if (item.classId && item.sessionsConducted > 0) {
                batch.update(doc(db, "classes", item.classId), {
                    sessionsSinceLastPayment: increment(-item.sessionsConducted)
                });
            }
        });

        await batch.commit();
        return { success: true };
    } catch (error) {
        console.error("Disbursement Sync Error:", error);
        return { success: false, error: "Fiscal ledger synchronization failed." };
    }
}
