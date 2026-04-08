import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { BarChart2, TrendingUp, Users, Calendar, ChevronLeft, Award } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const ReportsScreen = () => {
  const { teacherData } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [classStats, setClassStats] = useState<any[]>([]);

  const fetchReports = async () => {
    if (!teacherData?.id) return;
    setLoading(true);
    try {
      // Fetch all attendance for this teacher
      const q = query(
        collection(db, "attendance"),
        where("teacherId", "==", teacherData.id)
      );
      const snap = await getDocs(q);
      const records = snap.docs.map(doc => doc.data());

      // Group by class
      const classMap: Record<string, any> = {};
      records.forEach(rec => {
        if (!classMap[rec.classId]) {
          classMap[rec.classId] = {
            id: rec.classId,
            name: rec.className,
            totalSessions: 0,
            presentSum: 0,
            totalSum: 0
          };
        }
        
        const studentRecs = rec.records || {};
        const total = Object.keys(studentRecs).length;
        const present = Object.values(studentRecs).filter(v => v).length;
        
        classMap[rec.classId].totalSessions += 1;
        classMap[rec.classId].presentSum += present;
        classMap[rec.classId].totalSum += total;
      });

      const stats = Object.values(classMap).map((c: any) => ({
        ...c,
        avgAttendance: c.totalSum > 0 ? Math.round((c.presentSum / c.totalSum) * 100) : 0
      }));

      setClassStats(stats.sort((a, b) => b.avgAttendance - a.avgAttendance));
    } catch (error) {
      console.error("Reports Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [teacherData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const overallAvg = classStats.length > 0 
    ? Math.round(classStats.reduce((acc, c) => acc + c.avgAttendance, 0) / classStats.length)
    : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#64748B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Academic Reports</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Performance Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Award size={24} color="#fff" />
            <Text style={styles.overviewTitle}>Overall Attendance</Text>
          </View>
          <Text style={styles.overviewValue}>{overallAvg}%</Text>
          <Text style={styles.overviewSubtitle}>AVERAGE ACROSS ALL CLASSES</Text>
          
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${overallAvg}%` }]} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <BarChart2 size={18} color="#64748B" />
          <Text style={styles.sectionTitle}>CLASS-WISE PERFORMANCE</Text>
        </View>

        {classStats.length === 0 ? (
          <View style={styles.emptyState}>
             <Text style={styles.emptyText}>No data available yet.</Text>
          </View>
        ) : (
          classStats.map((item) => (
            <View key={item.id} style={styles.classStatCard}>
              <View style={styles.classInfo}>
                <Text style={styles.className}>{item.name}</Text>
                <Text style={styles.sessionCount}>{item.totalSessions} SESSIONS COMPLETED</Text>
              </View>
              
              <View style={styles.statGraph}>
                <View style={styles.barInfo}>
                  <Text style={styles.barLabel}>Attendance</Text>
                  <Text style={styles.barValue}>{item.avgAttendance}%</Text>
                </View>
                <View style={styles.miniTrack}>
                   <View 
                    style={[
                      styles.miniBar, 
                      { 
                        width: `${item.avgAttendance}%`, 
                        backgroundColor: item.avgAttendance > 75 ? '#10B981' : item.avgAttendance > 50 ? '#F59E0B' : '#EF4444' 
                      }
                    ]} 
                   />
                </View>
              </View>
            </View>
          ))
        )}
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 20,
  },
  overviewCard: {
    backgroundColor: '#6366F1',
    borderRadius: 32,
    padding: 30,
    marginBottom: 32,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  overviewTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overviewValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
  },
  overviewSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginTop: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1.5,
  },
  classStatCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  classInfo: {
    marginBottom: 20,
  },
  className: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  sessionCount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  statGraph: {
    gap: 8,
  },
  barInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  barValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E293B',
  },
  miniTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniBar: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  }
});

export default ReportsScreen;
