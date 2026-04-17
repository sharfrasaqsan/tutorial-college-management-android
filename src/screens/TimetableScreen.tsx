import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  Alert 
} from 'react-native';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronRight, BookOpen, Plus, Trash2, Edit2, ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TimetableScreen = () => {
  const { teacherData, isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [schedule, setSchedule] = useState<Record<string, any[]>>({});

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      let q;
      if (isAdmin) {
        q = query(collection(db, "classes"), where("status", "==", "active"));
      } else {
        if (!teacherData?.id) {
           setLoading(false);
           return;
        }
        q = query(
          collection(db, "classes"), 
          where("teacherId", "==", teacherData.id),
          where("status", "==", "active")
        );
      }
      
      const snap = await getDocs(q);
      const weeklySchedule: Record<string, any[]> = {};
      DAYS.forEach(day => weeklySchedule[day.toLowerCase()] = []);

      snap.docs.forEach(doc => {
        const cls = doc.data();
        (cls.schedules || []).forEach((slot: any) => {
          const day = slot.dayOfWeek.toLowerCase();
          if (weeklySchedule[day]) {
            weeklySchedule[day].push({
              id: doc.id,
              name: cls.name,
              subject: cls.subject,
              grade: cls.grade,
              teacherName: cls.teacherName || "Teacher",
              startTime: slot.startTime,
              endTime: slot.endTime,
              room: slot.room || "Room 01"
            });
          }
        });
      });

      Object.keys(weeklySchedule).forEach(day => {
        weeklySchedule[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
      });

      setSchedule(weeklySchedule);
    } catch (error) {
      console.error("Schedule Load Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [teacherData, isAdmin]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  const handleDelete = async (classId: string, className: string) => {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete ${className}? This will remove all scheduled times for this class.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'classes', classId));
              fetchSchedule();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete class');
            }
          }
        }
      ]
    );
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#64748B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Schedule</Text>
            <Text style={styles.subtitle}>WEEKLY CLASSES</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerAddButton} onPress={() => navigation.navigate('ManageClass', {})}>
           <Plus size={20} color="#fff" />
           <Text style={styles.headerAddText}>ADD CLASS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {DAYS.map((day) => {
          const dayKey = day.toLowerCase();
          const daySlots = schedule[dayKey] || [];
          
          return (
            <View key={day} style={styles.daySection}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day}</Text>
                <View style={styles.dayLine} />
              </View>

              {daySlots.length === 0 ? (
                <Text style={styles.noClasses}>No classes found.</Text>
              ) : (
                daySlots.map((slot, idx) => (
                  <View key={`${slot.id}-${idx}`} style={styles.slotCard}>
                    <View style={styles.timeBox}>
                      <Text style={styles.startTime}>{slot.startTime}</Text>
                      <Text style={styles.endTime}>{slot.endTime}</Text>
                    </View>
                    
                    <View style={styles.slotInfo}>
                      <Text style={styles.slotName}>{slot.name}</Text>
                      <View style={styles.slotDetails}>
                        <BookOpen size={12} color="#6366F1" />
                        <Text style={styles.slotSubject}>{slot.subject}</Text>
                        <View style={styles.dot} />
                        <Text style={styles.slotGrade}>{slot.grade}</Text>
                      </View>
                      <View style={styles.locationContainer}>
                        <MapPin size={12} color="#94A3B8" />
                        <Text style={styles.locationText}>{slot.room}{isAdmin ? ` • ${slot.teacherName}` : ''}</Text>
                      </View>
                    </View>

                    <View style={styles.slotActions}>
                       <TouchableOpacity style={styles.actionIcon} onPress={() => navigation.navigate('ManageClass', { classId: slot.id })}>
                          <Edit2 size={16} color="#6366F1" />
                       </TouchableOpacity>
                       <TouchableOpacity style={styles.actionIcon} onPress={() => handleDelete(slot.id, slot.name)}>
                          <Trash2 size={16} color="#EF4444" />
                       </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  headerAddText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 16,
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
    textTransform: 'uppercase',
    marginTop: 4,
  },
  scrollContent: {
    padding: 20,
  },
  daySection: {
    marginBottom: 32,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
    width: 100,
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 10,
  },
  noClasses: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  slotCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    alignItems: 'center',
  },
  timeBox: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    paddingRight: 12,
  },
  startTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  endTime: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  slotInfo: {
    flex: 1,
    paddingLeft: 16,
  },
  slotName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  slotDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  slotSubject: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
    marginLeft: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 8,
  },
  slotGrade: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  slotActions: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
    marginLeft: 8,
  },
  actionIcon: {
    padding: 4,
  }
});

export default TimetableScreen;
