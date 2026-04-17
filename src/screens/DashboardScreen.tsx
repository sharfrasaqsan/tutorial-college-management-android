import React, { useState, useEffect, useMemo } from 'react'; // Simple Dashboard Sync 2.0
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  SafeAreaView, 
  Dimensions, 
  StatusBar 
} from 'react-native';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { completeAcademicSession } from '../lib/sessions';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  ChevronRight, 
  LayoutDashboard, 
  ClipboardCheck, 
  BookOpen, 
  Users, 
  ArrowRight, 
  User, 
  History, 
  TrendingUp, 
  Award, 
  Layers, 
  Check, 
  CreditCard, 
  DollarSign, 
  TrendingDown, 
  Shield,
  QrCode
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const formatTime = (timeStr: string) => {
    if (!timeStr || timeStr === "--:--" || timeStr === "---") return timeStr;
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch {
        return timeStr;
    }
};

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const { teacherData, isAdmin } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = days[new Date().getDay()].toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];

  const [stats, setStats] = useState({
    totalStudents: 0,
    activeClasses: 0,
    pendingAttendance: 0
  });

  const [adminStats, setAdminStats] = useState({
    todayRevenue: 0,
    totalStudents: 0,
    activeClasses: 0,
    pendingSalaries: 0
  });

  useEffect(() => {
    if (!isAdmin) return;

    const qPayments = query(collection(db, "payments"), where("date", "==", todayStr), where("status", "==", "paid"));
    const unsubPayments = onSnapshot(qPayments, (snap) => {
        const total = snap.docs.reduce((acc, curr) => acc + (curr.data().amount || 0), 0);
        setAdminStats(prev => ({ ...prev, todayRevenue: total }));
    });

    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
        setAdminStats(prev => ({ ...prev, totalStudents: snap.size }));
    });

    const qClasses = query(collection(db, "classes"), where("status", "==", "active"));
    const unsubClasses = onSnapshot(qClasses, (snap) => {
        setAdminStats(prev => ({ ...prev, activeClasses: snap.size }));
    });

    const qSalaries = query(collection(db, "salaries"), where("status", "==", "pending"));
    const unsubSalaries = onSnapshot(qSalaries, (snap) => {
        setAdminStats(prev => ({ ...prev, pendingSalaries: snap.size }));
    });

    const qTimeline = query(collection(db, "classes"), where("status", "==", "active"));
    const unsubTimeline = onSnapshot(qTimeline, (snap) => {
        const results: any[] = [];
        snap.docs.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            (data.schedules || []).forEach((slot: any) => {
                const currentSlotDay = (slot.dayOfWeek || "").toLowerCase();
                if (currentSlotDay === dayOfWeek) {
                    results.push({
                        ...data,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        room: slot.room || "Room 01"
                    });
                }
            });
        });
        setTodayClasses(results.sort((a, b) => a.startTime.localeCompare(b.startTime)));
        setLoading(false);
    });

    return () => {
        unsubPayments();
        unsubStudents();
        unsubClasses();
        unsubSalaries();
        unsubTimeline();
    };
  }, [isAdmin, todayStr, dayOfWeek]);

  useEffect(() => {
    if (isAdmin || !teacherData?.id) {
        if (isAdmin) setLoading(false);
        return;
    }

    const qClasses = query(
      collection(db, "classes"), 
      where("teacherId", "==", teacherData.id),
      where("status", "==", "active")
    );

    let classes: any[] = [];
    let markedIds: string[] = [];
    let completionRecords: any[] = [];

    const updateMappedData = () => {
        const mappedClasses = classes.map(cls => ({
            ...cls,
            isAttendanceMarked: markedIds.includes(cls.id),
            isCompleted: completionRecords.some(r => 
                r.classId === cls.id && 
                r.startTime === cls.startTime
            )
        })).sort((a, b) => a.startTime.localeCompare(b.startTime));

        setTodayClasses(mappedClasses);
        setStats({
          totalStudents: classes.reduce((acc, curr) => acc + (curr.studentCount || 0), 0),
          activeClasses: classes.length,
          pendingAttendance: mappedClasses.filter(c => !c.isAttendanceMarked).length
        });
        setLoading(false);
        setRefreshing(false);
    };

    const unsubscribeClasses = onSnapshot(qClasses, (snap) => {
        const results: any[] = [];
        snap.docs.forEach(doc => {
          const cls = doc.data();
          const schedules = cls.schedules || [];
          const todaySlots = schedules.filter((s: any) => s.dayOfWeek.toLowerCase() === dayOfWeek);
          
          todaySlots.forEach((slot: any) => {
            results.push({
              id: doc.id,
              name: cls.name,
              subject: cls.subject,
              grade: cls.grade,
              studentCount: cls.studentCount || 0,
              completedSessions: cls.completedSessions || 0,
              startTime: slot.startTime,
              endTime: slot.endTime,
              room: slot.room || "Room 01"
            });
          });
        });
        classes = results;
        updateMappedData();
    });

    const attendanceQ = query(
      collection(db, "attendance"),
      where("date", "==", todayStr),
      where("teacherId", "==", teacherData.id)
    );
    const unsubscribeAttendance = onSnapshot(attendanceQ, (attSnap) => {
        markedIds = attSnap.docs.map(d => d.data().classId);
        updateMappedData();
    });

    const completionsQ = query(
      collection(db, "session_completions"),
      where("date", "==", todayStr),
      where("teacherId", "==", teacherData.id)
    );
    const unsubscribeCompletions = onSnapshot(completionsQ, (compSnap) => {
        completionRecords = compSnap.docs.map(d => d.data());
        updateMappedData();
    });

    return () => {
        unsubscribeClasses();
        unsubscribeAttendance();
        unsubscribeCompletions();
    };
  }, [teacherData, isAdmin, dayOfWeek, todayStr]);

  const markClassCompleted = async (classItem: any) => {
    if (!teacherData?.id) return;
    try {
      const result = await completeAcademicSession(classItem, {
        id: teacherData.id,
        name: teacherData.name || "Teacher"
      });
      if (result.success) {
        alert(`Class ${classItem.name} marked as done!`);
      } else if (result.alreadyMarked) {
        alert(result.error);
      } else {
        alert("Failed to mark class as done.");
      }
    } catch (error) {
      console.error("Completion Error:", error);
      alert("Error saving class status.");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const nextClass = useMemo(() => {
    if (todayClasses.length === 0) return null;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const upcoming = todayClasses.find(cls => {
      const [hours, minutes] = cls.startTime.split(':').map(Number);
      const classStartTime = hours * 60 + minutes;
      return classStartTime > currentTime && !cls.isCompleted;
    });
    return upcoming || null;
  }, [todayClasses]);

  if (loading && !refreshing && !isAdmin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (isAdmin) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.header}>
            <View>
              <View style={styles.liveIndicator}>
                 <View style={styles.pulseDot} />
                 <Text style={styles.liveText}>ADMIN ACCESS</Text>
              </View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.teacherName}>Admin</Text>
            </View>
            <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile' as any)}>
              <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.avatarGradient}>
                <Text style={styles.avatarText}>A</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.statRowAdmin}>
            <TouchableOpacity 
              style={[styles.statBoxSmall, { backgroundColor: '#F0F9FF' }]}
              onPress={() => navigation.navigate('Finance')}
            >
               <TrendingUp size={16} color="#0369A1" />
               <Text style={styles.statNumSmall}>{adminStats.todayRevenue > 1000 ? (adminStats.todayRevenue/1000).toFixed(1)+'K' : adminStats.todayRevenue}</Text>
               <Text style={styles.statLabelSmall}>Income</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.statBoxSmall, { backgroundColor: '#F0FDF4' }]}
              onPress={() => navigation.navigate('Students')}
            >
               <Users size={16} color="#15803D" />
               <Text style={styles.statNumSmall}>{adminStats.totalStudents}</Text>
               <Text style={styles.statLabelSmall}>Students</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statBoxSmall, { backgroundColor: '#EEF2FF' }]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Timetable' } as any)}
            >
               <Layers size={16} color="#4338CA" />
               <Text style={styles.statNumSmall}>{adminStats.activeClasses}</Text>
               <Text style={styles.statLabelSmall}>Classes</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.statBoxSmall, { backgroundColor: '#FEF2F2' }]}
              onPress={() => navigation.navigate('Finance')}
            >
               <CreditCard size={16} color="#B91C1C" />
               <Text style={styles.statNumSmall}>{adminStats.pendingSalaries}</Text>
               <Text style={styles.statLabelSmall}>Pay</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.smallScannerBar} onPress={() => navigation.navigate('AdminQRScanner')}>
            <LinearGradient 
              colors={['#0F172A', '#334155']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 0 }}
              style={styles.smallScannerGradient}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.scannerIconSmall}>
                   <QrCode size={18} color="#fff" />
                </View>
                <Text style={styles.scannerTextSmall}>Launch Student QR Scanner</Text>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>QUICK MENU</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Finance')}>
              <View style={[styles.actionIcon, { backgroundColor: '#FDF2F8' }]}>
                <DollarSign size={22} color="#DB2777" />
              </View>
              <Text style={styles.actionLabel}>Payments</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Teachers')}>
               <View style={[styles.actionIcon, { backgroundColor: '#F0F9FF' }]}>
                  <User size={22} color="#0EA5E9" />
               </View>
               <Text style={styles.actionLabel}>Teachers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Students')}>
              <View style={[styles.actionIcon, { backgroundColor: '#FAF5FF' }]}>
                <Users size={22} color="#7E22CE" />
              </View>
              <Text style={styles.actionLabel}>Students</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MainTabs', { screen: 'Timetable' } as any)}>
              <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                <CalendarIcon size={22} color="#4F46E5" />
              </View>
              <Text style={styles.actionLabel}>Schedule</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>TODAY CLASSES</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{todayClasses.length}</Text>
            </View>
          </View>

          {todayClasses.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <CalendarIcon size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No classes today</Text>
              <Text style={styles.emptySubtitle}>There are no classes scheduled for today.</Text>
            </View>
          ) : (
            todayClasses.map((cls, idx) => (
              <TouchableOpacity 
                key={`${cls.id}-${idx}`} 
                style={[styles.scheduleCard, cls.isCompleted && { opacity: 0.6 }]}
                onPress={() => navigation.navigate('MarkAttendance', { 
                  classId: cls.id, 
                  className: cls.name, 
                  grade: cls.grade,
                  teacherId: cls.teacherId 
                })}
              >
                <View style={styles.scheduleTimeContainer}>
                  <Text style={styles.scheduleStartTime}>{formatTime(cls.startTime)}</Text>
                  <Text style={styles.scheduleEndTime}>{formatTime(cls.endTime)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.scheduleInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.scheduleName}>{cls.name}</Text>
                    {cls.isCompleted && <Check size={14} color="#10B981" strokeWidth={3} />}
                  </View>
                  <View style={styles.scheduleDetails}>
                    <Text style={styles.scheduleSubject}>{cls.subject}</Text>
                    <View style={styles.dot} />
                    <Text style={styles.scheduleGrade}>{cls.grade}</Text>
                    <View style={styles.dot} />
                    <Text style={styles.scheduleGrade}>{cls.teacherName || 'Teacher'}</Text>
                  </View>
                  <View style={styles.scheduleLocation}>
                    <MapPin size={12} color="#94A3B8" />
                    <Text style={styles.locationText}>{cls.room}</Text>
                  </View>
                </View>
                <View style={styles.scheduleAction}>
                  <ChevronRight size={20} color="#CBD5E1" />
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <View style={styles.liveIndicator}>
               <View style={styles.pulseDot} />
               <Text style={styles.liveText}>TEACHER DASHBOARD</Text>
            </View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.teacherName}>{teacherData?.name?.split(' ')[0] || 'Teacher'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile' as any)}
          >
            <LinearGradient
              colors={['#6366F1', '#4F46E5']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{teacherData?.name?.charAt(0) || 'T'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.statRowAdmin}>
          <TouchableOpacity 
            style={[styles.statBoxSmall, { backgroundColor: '#F0F9FF' }]}
            onPress={() => navigation.navigate('Students')}
          >
            <Users size={16} color="#0369A1" />
            <Text style={styles.statNumSmall}>{stats.totalStudents}</Text>
            <Text style={styles.statLabelSmall}>Students</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statBoxSmall, { backgroundColor: '#F0FDF4' }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Timetable' } as any)}
          >
            <Layers size={16} color="#15803D" />
            <Text style={styles.statNumSmall}>{stats.activeClasses}</Text>
            <Text style={styles.statLabelSmall}>Classes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statBoxSmall, { backgroundColor: '#FEF2F2' }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Timetable' } as any)}
          >
            <ClipboardCheck size={16} color="#B91C1C" />
            <Text style={styles.statNumSmall}>{stats.pendingAttendance}</Text>
            <Text style={styles.statLabelSmall}>To Mark</Text>
          </TouchableOpacity>
        </View>

        {nextClass && (
          <TouchableOpacity 
            style={styles.smallScannerBar}
            onPress={() => navigation.navigate('MarkAttendance', { 
                classId: nextClass.id, 
                className: nextClass.name, 
                grade: nextClass.grade,
                teacherId: teacherData.id 
              })}
          >
            <LinearGradient
              colors={['#4F46E5', '#3730A3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.smallScannerGradient}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.scannerIconSmall, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Clock size={18} color="#fff" />
                </View>
                <View>
                  <Text style={[styles.scannerTextSmall, { marginBottom: 2 }]}>Next: {nextClass.name}</Text>
                  <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: '700' }}>{formatTime(nextClass.startTime)} • {nextClass.room}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>VIEW</Text>
                 <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MENU</Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.actionsContainer}
        >
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MainTabs', { screen: 'Timetable' } as any)}>
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <CalendarIcon size={22} color="#4F46E5" />
            </View>
            <Text style={styles.actionLabel}>Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Reports')}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
              <History size={22} color="#15803D" />
            </View>
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Reports')}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
              <Award size={22} color="#C2410C" />
            </View>
            <Text style={styles.actionLabel}>Stats</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Students')}>
            <View style={[styles.actionIcon, { backgroundColor: '#FAF5FF' }]}>
              <Users size={22} color="#7E22CE" />
            </View>
            <Text style={styles.actionLabel}>Students</Text>
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('RegistryManage')}>
              <View style={[styles.actionIcon, { backgroundColor: '#F0FDFA' }]}>
                <Shield size={22} color="#0D9488" />
              </View>
              <Text style={styles.actionLabel}>Admin</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>TODAY CLASSES</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{todayClasses.length}</Text>
          </View>
        </View>

        {todayClasses.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <CalendarIcon size={40} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No classes today</Text>
            <Text style={styles.emptySubtitle}>There are no classes scheduled for today.</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
               <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          todayClasses.map((cls, idx) => (
            <TouchableOpacity 
              key={`${cls.id}-${idx}`} 
              style={[styles.scheduleCard, cls.isCompleted && { borderColor: '#E2E8F0', opacity: 0.8 }]}
              onPress={() => navigation.navigate('MarkAttendance', { 
                classId: cls.id, 
                className: cls.name, 
                grade: cls.grade,
                teacherId: teacherData?.id 
              })}
            >
              <View style={styles.scheduleTimeContainer}>
                <Text style={styles.scheduleStartTime}>{formatTime(cls.startTime)}</Text>
                <Text style={styles.scheduleEndTime}>{formatTime(cls.endTime)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.scheduleInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.scheduleName}>{cls.name}</Text>
                  {cls.isCompleted && (
                    <View style={styles.completedBadge}>
                      <Check size={10} color="#10B981" strokeWidth={4} />
                    </View>
                  )}
                </View>
                <View style={styles.scheduleDetails}>
                  <Text style={styles.scheduleSubject}>{cls.subject}</Text>
                  <View style={styles.dot} />
                  <Text style={styles.scheduleGrade}>{cls.grade}</Text>
                  <View style={styles.dot} />
                  <Text style={styles.sessionCountText}>{cls.completedSessions || 0} Lessons</Text>
                </View>
                <View style={styles.scheduleLocation}>
                  <MapPin size={12} color="#94A3B8" />
                  <Text style={styles.locationText}>{cls.room}</Text>
                </View>
              </View>
              <View style={styles.scheduleAction}>
                {cls.isCompleted ? (
                  <Text style={styles.doneText}>DONE</Text>
                ) : (
                  <TouchableOpacity 
                    style={styles.markCompleteBtn}
                    onPress={() => markClassCompleted(cls)}
                  >
                    <Check size={14} color="#fff" strokeWidth={3} />
                    <Text style={styles.markCompleteBtnText}>DONE</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFBFE',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  teacherName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  profileButton: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
  },
  liveText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 1,
  },
  completedBadge: {
    padding: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
  },
  doneText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 1,
  },
  statRowAdmin: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  statBoxSmall: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumSmall: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 6,
  },
  statLabelSmall: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  smallScannerBar: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  smallScannerGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scannerIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTextSmall: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  actionsContainer: {
    paddingRight: 20,
    gap: 12,
  },
  actionCard: {
    width: 100,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  countBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
  },
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  scheduleTimeContainer: {
    width: 60,
    alignItems: 'center',
  },
  scheduleStartTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  scheduleEndTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  scheduleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  scheduleSubject: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  scheduleGrade: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  sessionCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  scheduleLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  scheduleAction: {
    paddingLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  markCompleteBtnText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  }
});

export default DashboardScreen;
