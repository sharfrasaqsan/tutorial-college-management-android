import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { History, Calendar as CalendarIcon, Clock, ChevronLeft, MapPin, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';

const ClassSessionsScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ClassSessions'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { classId, className } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);

  const fetchHistory = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "session_completions"), 
        where("classId", "==", classId),
        orderBy("date", "desc"),
        orderBy("startTime", "desc")
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(logs);
    } catch (error) {
      console.error("Session History Load Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [classId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "--:--";
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    } catch {
        return timeStr;
    }
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#64748B" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{className.replace(/\s*\([^)]*\)$/, "").trim()}</Text>
          <Text style={styles.subtitle}>SESSION COMPLETION LEDGER</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <History size={48} color="#E2E8F0" />
            <Text style={styles.emptyText}>No completion logs recorded for this unit.</Text>
          </View>
        ) : (
          sessions.map((log) => (
               <View key={log.id} style={styles.historyCard}>
                  <View style={styles.cardHeader}>
                    <LinearGradient colors={['#F0F9FF', '#E0F2FE']} style={styles.dateBadge}>
                       <CalendarIcon size={12} color="#0EA5E9" style={{ marginRight: 6 }} />
                       <Text style={styles.dateText}>{log.date}</Text>
                    </LinearGradient>
                    <View style={styles.idBadge}>
                        <Text style={styles.idText}>LOG: {log.id.slice(-6).toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                     <View style={styles.mainInfo}>
                        <View style={styles.timeRow}>
                            <Clock size={12} color="#64748B" />
                            <Text style={styles.timeVal}>{formatTime(log.startTime)} Session</Text>
                        </View>
                        <View style={styles.locationRow}>
                            <MapPin size={12} color="#94A3B8" />
                            <Text style={styles.locationVal}>{log.room || 'Main Hall'}</Text>
                        </View>
                     </View>

                     <View style={styles.statsColumn}>
                        <View style={styles.statBox}>
                            <Users size={12} color="#6366F1" />
                            <Text style={styles.statVal}>{log.studentCount || 0} PRESENT</Text>
                        </View>
                        <View style={[styles.statusTag, log.isPaid ? styles.paidTag : styles.unpaidTag]}>
                            <Text style={[styles.statusTagText, log.isPaid ? styles.paidTagText : styles.unpaidTagText]}>
                                {log.isPaid ? 'DISBURSED' : 'PENDING'}
                            </Text>
                        </View>
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
    backgroundColor: '#FBFBFE',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 20,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
  },
  historyCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0EA5E9',
  },
  idBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  idText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  mainInfo: {
    gap: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  statsColumn: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statVal: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6366F1',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidTag: {
    backgroundColor: '#ECFDF5',
  },
  unpaidTag: {
    backgroundColor: '#FFFBEB',
  },
  statusTagText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  paidTagText: {
    color: '#10B981',
  },
  unpaidTagText: {
    color: '#D97706',
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

export default ClassSessionsScreen;
