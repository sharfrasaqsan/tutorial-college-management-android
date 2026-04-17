import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { disburseSalaryPayment } from '../lib/payroll';
import { 
  DollarSign, 
  CreditCard, 
  History, 
  Activity, 
  ChevronRight, 
  Share2, 
  Calendar as CalendarIcon,
  TrendingUp,
  ArrowRight
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SalaryScreen = () => {
  const { user, isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
       if (!user?.uid) return;
        const qSals = query(collection(db, "salaries"), where("teacherId", "==", user.uid), orderBy("createdAt", "desc"));
        const qClasses = query(collection(db, "classes"), where("teacherId", "==", user.uid));
        
        const unsubSals = onSnapshot(qSals, (snap) => {
            setSalaries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        const unsubClasses = onSnapshot(qClasses, (snap) => {
            setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => { unsubSals(); unsubClasses(); };
    } else {
        // Admin View: Fetch all teachers and all classes/salaries to build a rollup
        const unsubTeachers = onSnapshot(collection(db, "teachers"), (snap) => {
            setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        
        const unsubAllClasses = onSnapshot(collection(db, "classes"), (snap) => {
            setClasses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const qAllSals = query(collection(db, "salaries"), orderBy("createdAt", "desc"));
        const unsubAllSals = onSnapshot(qAllSals, (snap) => {
           setSalaries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => { unsubTeachers(); unsubAllClasses(); unsubAllSals(); };
    }
  }, [user, isAdmin]);

  const stats = useMemo(() => {
    const relevantSalaries = selectedTeacherId ? salaries.filter(s => s.teacherId === selectedTeacherId) : salaries;
    const relevantClasses = selectedTeacherId ? classes.filter(c => c.teacherId === selectedTeacherId) : classes;

    const totalPaid = relevantSalaries.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
    const pendingSessions = relevantClasses.reduce((acc, curr) => acc + (curr.sessionsSinceLastPayment || 0), 0);
    const benchmark = relevantClasses.reduce((acc, curr) => acc + (curr.sessionsPerCycle || 8), 0) || 8;

    return {
      totalPaid,
      pendingSessions,
      progress: Math.min(100, (pendingSessions / benchmark) * 100)
    };
  }, [salaries, classes, selectedTeacherId]);

  const handleProcessPayment = async (salaryId: string) => {
    if (!isAdmin) return;
    
    // Find the salary item to get its breakdown
    const salaryItem = salaries.find(s => s.id === salaryId);
    if (!salaryItem) return;

    const confirmation = await new Promise(resolve => {
       alert(
        'Fiscal Authorization Required',
        `Are you sure you want to authorize the disbursement of LKR ${salaryItem.netAmount?.toLocaleString()}? This will atomically reset the associated session counters.`,
        [
          { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
          { text: 'Authorize Payout', onPress: () => resolve(true), style: 'destructive' }
        ]
      );
    });

    if (!confirmation) return;
    
    setLoading(true);
    try {
        const result = await disburseSalaryPayment(salaryId, salaryItem.breakdown || []);
        if (result.success) {
          alert("Fiscal Disbursement Finalized.");
        } else {
          alert(result.error || "Disbursement Failed.");
        }
    } catch (e) {
        console.error(e);
        alert("Institutional Sync Failed.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financial Terminal</Text>
        <Text style={styles.headerSubtitle}>FACULTY PAYROLL & CYCLES</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* HUD - Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
             <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                <DollarSign size={18} color="#6366F1" />
             </View>
             <Text style={styles.statValue}>LKR {stats.totalPaid.toLocaleString()}</Text>
             <Text style={styles.statLabel}>TOTAL PAID</Text>
          </View>
          <View style={styles.statCard}>
             <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
                <Activity size={18} color="#10B981" />
             </View>
             <Text style={styles.statValue}>{stats.pendingSessions}</Text>
             <Text style={styles.statLabel}>UNPAID SLOTS</Text>
          </View>
        </View>

        {isAdmin && !selectedTeacherId ? (
          <View>
            <View style={styles.sectionHeader}>
               <Text style={styles.sectionTitle}>FACULTY CYCLE TRACKER</Text>
            </View>
            {teachers.map(t => {
                const teacherClasses = classes.filter(c => c.teacherId === t.id);
                const pending = teacherClasses.reduce((acc, curr) => acc + (curr.sessionsSinceLastPayment || 0), 0);
                const bench = teacherClasses.reduce((acc, curr) => acc + (curr.sessionsPerCycle || 8), 0) || 8;
                const prog = Math.min(100, (pending / bench) * 100);

                return (
                    <TouchableOpacity key={t.id} style={styles.teacherCard} onPress={() => setSelectedTeacherId(t.id)}>
                        <View style={styles.teacherInfo}>
                           <View style={styles.avatarMini}>
                              <Text style={styles.avatarMiniText}>{t.name?.charAt(0)}</Text>
                           </View>
                           <View>
                              <Text style={styles.teacherNameText}>{t.name}</Text>
                              <Text style={styles.teacherSubText}>{pending} Pending Sessions</Text>
                           </View>
                        </View>
                        <View style={styles.teacherProgress}>
                           <Text style={[styles.progText, prog >= 90 && { color: '#EF4444' }]}>{Math.round(prog)}%</Text>
                           <View style={styles.miniTrack}>
                               <View style={[styles.miniBar, { width: `${prog}%` }, prog >= 90 && { backgroundColor: '#EF4444' }]} />
                           </View>
                        </View>
                    </TouchableOpacity>
                );
            })}
          </View>
        ) : (
          <View>
            {isAdmin && (
              <TouchableOpacity onPress={() => setSelectedTeacherId(null)} style={styles.backLink}>
                 <ChevronRight size={14} color="#6366F1" style={{ transform: [{rotate: '180deg'}] }} />
                 <Text style={styles.backLinkText}>Back to Rollup</Text>
              </TouchableOpacity>
            )}
            
            {/* Progress Card */}
            <View style={styles.progressCard}>
               <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Cycle Completion</Text>
                  <Text style={styles.progressPercent}>{Math.round(stats.progress)}%</Text>
               </View>
               <View style={styles.track}>
                  <View style={[styles.bar, { width: `${stats.progress}%` }]} />
               </View>
               <Text style={styles.progressSub}>Institutional Benchmark: 8 Sessions/Cycle</Text>
            </View>

            {/* History Ledger */}
            <View style={styles.sectionHeader}>
               <Text style={styles.sectionTitle}>PAYMENT HISTORY LEDGER</Text>
            </View>

            {salaries.filter(s => !selectedTeacherId || s.teacherId === selectedTeacherId).length === 0 ? (
              <View style={styles.empty}>
                 <History size={48} color="#E2E8F0" />
                 <Text style={styles.emptyText}>No salary disbursements recorded yet.</Text>
              </View>
            ) : salaries.filter(s => !selectedTeacherId || s.teacherId === selectedTeacherId).map((item) => (
              <View key={item.id} style={styles.salaryCard}>
                 <View style={styles.cardInfo}>
                    <View style={styles.dateCircle}>
                       <Text style={styles.monthText}>{item.month?.split('-')[1] || '01'}</Text>
                       <Text style={styles.yearText}>{item.month?.split('-')[0] || '2026'}</Text>
                    </View>
                    <View style={styles.mainInfo}>
                       <Text style={styles.salaryAmount}>LKR {item.netAmount?.toLocaleString()}</Text>
                       <View style={styles.statusRow}>
                          <View style={[styles.statusDot, { backgroundColor: item.status === 'paid' ? '#10B981' : '#F59E0B' }]} />
                          <Text style={styles.statusText}>{item.status?.toUpperCase() || 'AWATING'}</Text>
                       </View>
                    </View>
                 </View>
                 {isAdmin && item.status !== 'paid' ? (
                   <TouchableOpacity 
                    style={styles.processBtn}
                    onPress={() => handleProcessPayment(item.id)}
                   >
                     <Text style={styles.processBtnText}>PAY</Text>
                   </TouchableOpacity>
                 ) : (
                   <TouchableOpacity style={styles.shareButton}>
                      <Share2 size={16} color="#94A3B8" />
                   </TouchableOpacity>
                 )}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 2,
    marginTop: 4,
  },
  scrollContent: {
    padding: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 32,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '900',
    color: '#6366F1',
  },
  track: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  bar: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  progressSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
  },
  salaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
  },
  yearText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
  },
  mainInfo: {
    justifyContent: 'center',
  },
  salaryAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
  },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  teacherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6366F1',
  },
  teacherNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  teacherSubText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  teacherProgress: {
    alignItems: 'flex-end',
    width: 100,
  },
  progText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6366F1',
    marginBottom: 4,
  },
  miniTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBar: {
    height: '100%',
    backgroundColor: '#6366F1',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  backLinkText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  processBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  processBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
  },
});

export default SalaryScreen;
