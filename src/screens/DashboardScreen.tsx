import React, { useState, useEffect, useMemo } from 'react';
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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, 
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
  Award
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const DashboardScreen = () => {
  const { teacherData } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [stats, setStats] = useState({
    attendance: '0%',
    daysThisMonth: 0,
    weeklyAvg: 0
  });

  const fetchTodayClasses = async () => {
    if (!teacherData?.id) return;
    setLoading(true);
    try {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayOfWeek = days[new Date().getDay()];

      const q = query(
        collection(db, "classes"), 
        where("teacherId", "==", teacherData.id),
        where("status", "==", "active")
      );
      
      const snap = await getDocs(q);
      const classes: any[] = [];
      let totalWeeklySessions = 0;
      
      snap.docs.forEach(doc => {
        const cls = doc.data();
        const schedules = cls.schedules || [];
        totalWeeklySessions += schedules.length;

        const todaySlots = schedules.filter((s: any) => s.dayOfWeek.toLowerCase() === dayOfWeek);
        todaySlots.forEach((slot: any) => {
          classes.push({
            id: doc.id,
            name: cls.name,
            subject: cls.subject,
            grade: cls.grade,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room || "Room 01"
          });
        });
      });

      setTodayClasses(classes.sort((a, b) => a.startTime.localeCompare(b.startTime)));
      
      // Fetch Attendance Stats
      await fetchAttendanceStats(teacherData.id, totalWeeklySessions);
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAttendanceStats = async (teacherId: string, weeklySessions: number) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const q = query(
        collection(db, "attendance"),
        where("teacherId", "==", teacherId),
        where("createdAt", ">=", thirtyDaysAgo)
      );
      
      const snap = await getDocs(q);
      const records = snap.docs.map(d => d.data());
      
      // Calculate Avg Attendance %
      let totalPercent = 0;
      records.forEach(rec => {
        const studentRecords = rec.records || {};
        const total = Object.keys(studentRecords).length;
        const present = Object.values(studentRecords).filter(v => v).length;
        if (total > 0) totalPercent += (present / total) * 100;
      });
      
      const avgAttendance = records.length > 0 ? Math.round(totalPercent / records.length) : 0;
      
      // Calculate unique days taught this month
      const now = new Date();
      const uniqueDays = new Set(
        records
          .filter(rec => {
            const date = rec.createdAt?.toDate ? rec.createdAt.toDate() : new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
          })
          .map(rec => rec.date)
      ).size;

      setStats({
        attendance: `${avgAttendance}%`,
        daysThisMonth: uniqueDays,
        weeklyAvg: weeklySessions
      });
    } catch (error) {
      console.error("Stats Error:", error);
    }
  };

  useEffect(() => {
    fetchTodayClasses();
  }, [teacherData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTodayClasses();
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
      return classStartTime > currentTime;
    });

    return upcoming || null;
  }, [todayClasses]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
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
        {/* Header Section */}
        <View style={styles.header}>
          <View>
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

        {/* Next Class Highlight */}
        {nextClass && (
          <TouchableOpacity 
            style={styles.nextClassContainer}
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
              end={{ x: 1, y: 1 }}
              style={styles.nextClassGradient}
            >
              <View style={styles.nextClassHeader}>
                <View style={styles.nextBadge}>
                  <Text style={styles.nextBadgeText}>NEXT SESSION</Text>
                </View>
                <View style={styles.timeBadge}>
                  <Clock size={12} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={styles.timeBadgeText}>{nextClass.startTime}</Text>
                </View>
              </View>
              
              <Text style={styles.nextClassName}>{nextClass.name}</Text>
              <Text style={styles.nextClassSubject}>{nextClass.subject} • {nextClass.grade}</Text>
              
              <View style={styles.nextClassFooter}>
                <View style={styles.locationContainer}>
                  <MapPin size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.nextClassRoom}>{nextClass.room}</Text>
                </View>
                <View style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Start Attendance</Text>
                  <ArrowRight size={16} color="#fff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Quick Stats Grid */}
        <View style={styles.statsRow}>
          <View style={[styles.statItem, { backgroundColor: '#F0F9FF' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#BAe6FD' }]}>
              <BookOpen size={20} color="#0369A1" />
            </View>
            <Text style={styles.statNumber}>{todayClasses.length}</Text>
            <Text style={styles.statTitle}>Today</Text>
          </View>
          
          <View style={[styles.statItem, { backgroundColor: '#F0FDF4' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#BBF7D0' }]}>
              <ClipboardCheck size={20} color="#15803D" />
            </View>
            <Text style={styles.statNumber}>{stats.attendance}</Text>
            <Text style={styles.statTitle}>Avg Attendance</Text>
          </View>

          <View style={[styles.statItem, { backgroundColor: '#FEF2F2' }]}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FECACA' }]}>
              <TrendingUp size={20} color="#B91C1C" />
            </View>
            <Text style={styles.statNumber}>{stats.weeklyAvg}</Text>
            <Text style={styles.statTitle}>Per Week</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.actionsContainer}
        >
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('MainTabs', { screen: 'Timetable' } as any)}>
            <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
              <Calendar size={22} color="#4F46E5" />
            </View>
            <Text style={styles.actionLabel}>Timetable</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard} 
            onPress={() => navigation.navigate('MainTabs', { screen: 'AttendanceHistory' } as any)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
              <History size={22} color="#15803D" />
            </View>
            <Text style={styles.actionLabel}>History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Reports')}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
              <Award size={22} color="#C2410C" />
            </View>
            <Text style={styles.actionLabel}>Reports</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Students')}>
            <View style={[styles.actionIcon, { backgroundColor: '#FAF5FF' }]}>
              <Users size={22} color="#7E22CE" />
            </View>
            <Text style={styles.actionLabel}>Students</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Schedule Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>TODAY'S SCHEDULE</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{todayClasses.length}</Text>
          </View>
        </View>

        {todayClasses.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconContainer}>
              <Calendar size={40} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Classes Today</Text>
            <Text style={styles.emptySubtitle}>Enjoy your day off or check your upcoming schedule.</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
               <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          todayClasses.map((cls, idx) => {
            const isNext = nextClass?.id === cls.id;
            return (
              <TouchableOpacity 
                key={`${cls.id}-${idx}`} 
                style={[styles.scheduleCard, isNext && styles.nextScheduleCard]}
                onPress={() => navigation.navigate('MarkAttendance', { 
                  classId: cls.id, 
                  className: cls.name, 
                  grade: cls.grade,
                  teacherId: teacherData.id 
                })}
              >
                <View style={styles.scheduleTimeContainer}>
                  <Text style={styles.scheduleStartTime}>{cls.startTime}</Text>
                  <Text style={styles.scheduleEndTime}>{cls.endTime}</Text>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleName}>{cls.name}</Text>
                  <View style={styles.scheduleDetails}>
                    <Text style={styles.scheduleSubject}>{cls.subject}</Text>
                    <View style={styles.dot} />
                    <Text style={styles.scheduleGrade}>{cls.grade}</Text>
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
            );
          })
        )}
        
        {/* Padding at bottom */}
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
  nextClassContainer: {
    marginBottom: 30,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  nextClassGradient: {
    padding: 24,
  },
  nextClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  nextBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  nextClassName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  nextClassSubject: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  nextClassFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextClassRoom: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 12,
  },
  statItem: {
    flex: 1,
    padding: 16,
    borderRadius: 24,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  actionsContainer: {
    paddingRight: 20,
    gap: 16,
  },
  actionCard: {
    alignItems: 'center',
    width: 80,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  nextScheduleCard: {
    borderColor: '#C7D2FE',
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  scheduleTimeContainer: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleStartTime: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  scheduleEndTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
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
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  scheduleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  scheduleSubject: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  scheduleGrade: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  scheduleLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  scheduleAction: {
    paddingLeft: 10,
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
    fontSize: 14,
    fontWeight: '700',
  }
});

export default DashboardScreen;

