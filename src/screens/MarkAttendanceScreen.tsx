import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Check, X, Users, ChevronLeft, Calendar, Loader2 } from 'lucide-react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { Student } from '../types/models';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MarkAttendanceScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'MarkAttendance'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { classId, className, grade, teacherId } = route.params;

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceData, setAttendanceData] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "students"), where("grade", "==", grade));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
        setStudents(list);
        
        const initial: Record<string, boolean> = {};
        list.forEach(s => initial[s.id] = true);
        setAttendanceData(initial);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load students');
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, [grade]);

  const toggleStatus = (id: string) => {
    setAttendanceData(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, "attendance"), {
        classId,
        className,
        teacherId,
        date: new Date().toISOString().split('T')[0],
        records: attendanceData,
        createdAt: serverTimestamp()
      });
      Alert.alert('Success', 'Attendance marked successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to sync attendance');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const presentCount = Object.values(attendanceData).filter(v => v).length;
  const absentCount = students.length - presentCount;

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#64748B" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
           <Text style={styles.headerTitle}>{className}</Text>
           <Text style={styles.headerDate}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} • {grade}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryBox}>
           <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>PRESENT</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>{presentCount}</Text>
           </View>
           <View style={styles.summaryDivider} />
           <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>ABSENT</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{absentCount}</Text>
           </View>
           <View style={styles.summaryDivider} />
           <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL</Text>
              <Text style={[styles.summaryValue, { color: '#6366F1' }]}>{students.length}</Text>
           </View>
        </View>

        <Text style={styles.listLabel}>STUDENT LIST</Text>

        {students.map((s) => (
          <TouchableOpacity 
            key={s.id} 
            style={[styles.studentCard, !attendanceData[s.id] && styles.absentCard]}
            onPress={() => toggleStatus(s.id)}
          >
            <View style={styles.studentInfo}>
               <View style={[styles.initialCircle, !attendanceData[s.id] && styles.absentCircle]}>
                  <Text style={styles.initialText}>{s.name.charAt(0)}</Text>
               </View>
               <View>
                  <Text style={[styles.studentName, !attendanceData[s.id] && styles.absentText]}>{s.name}</Text>
                  <Text style={styles.studentSchool}>{s.schoolName}</Text>
               </View>
            </View>
            <View style={[styles.checkbox, attendanceData[s.id] ? styles.checked : styles.unchecked]}>
               {attendanceData[s.id] ? <Check size={16} color="#fff" strokeWidth={4} /> : <X size={16} color="#CBD5E1" strokeWidth={4} />}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleSubmit}
          disabled={submitting || students.length === 0}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.submitButtonText}>AUTHORIZE ATTENDANCE</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
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
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  headerInfo: {
    marginLeft: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerDate: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  summaryDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#F1F5F9',
    alignSelf: 'center',
  },
  listLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
    marginBottom: 20,
    marginLeft: 4,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  absentCard: {
    backgroundColor: '#FAFAFA',
    borderColor: '#F1F5F9',
    opacity: 0.6,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  initialCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  absentCircle: {
    backgroundColor: '#F1F5F9',
  },
  initialText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#6366F1',
  },
  studentName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
  },
  absentText: {
    color: '#94A3B8',
  },
  studentSchool: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  checked: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  unchecked: {
    backgroundColor: 'transparent',
    borderColor: '#CBD5E1',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  submitButton: {
    backgroundColor: '#0F172A',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  }
});

export default MarkAttendanceScreen;
