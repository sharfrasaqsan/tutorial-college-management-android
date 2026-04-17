import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ClipboardCheck, Calendar as CalendarIcon, Clock, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const AttendanceHistoryScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "attendance"), 
        where("teacherId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(15)
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(logs);
    } catch (error) {
      console.error("History Load Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Compliance Ledger</Text>
        <Text style={styles.subtitle}>SESSION REGISTRY LOGS</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ClipboardCheck size={48} color="#E2E8F0" />
            <Text style={styles.emptyText}>No attendance records found.</Text>
          </View>
        ) : (
          history.map((log) => {
             const records = log.records || {};
             const total = Object.keys(records).length;
             const present = Object.values(records).filter(v => v).length;
             const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

             return (
               <View key={log.id} style={styles.historyCard}>
                  <LinearGradient colors={['#F0F9FF', '#E0F2FE']} style={styles.dateCircle}>
                     <CalendarIcon size={14} color="#0EA5E9" />
                     <Text style={styles.dateText}>{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
                  </LinearGradient>

                  <View style={styles.cardInfo}>
                     <Text style={styles.className}>{log.className}</Text>
                     <View style={styles.timeRow}>
                        <Clock size={10} color="#94A3B8" />
                        <Text style={styles.timeText}>MARKED @ {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</Text>
                     </View>
                  </View>

                  <View style={styles.participationContainer}>
                     <Text style={styles.percentText}>{percentage}%</Text>
                     <Text style={styles.countText}>{present}/{total}</Text>
                  </View>
               </View>
             );
          })
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
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 2,
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dateCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0EA5E9',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  className: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  participationContainer: {
    alignItems: 'flex-end',
    paddingLeft: 10,
  },
  percentText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
  }
});

export default AttendanceHistoryScreen;
