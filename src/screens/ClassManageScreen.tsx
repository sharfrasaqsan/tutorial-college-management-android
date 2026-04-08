import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform
} from 'react-native';
import { doc, getDoc, collection, query, getDocs, orderBy, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Plus, Trash2, Clock, MapPin, Save, BookOpen, CreditCard, ChevronDown } from 'lucide-react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ClassManageScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ManageClass'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { teacherData } = useAuth();
  const { classId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data lists
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [initialGradeId, setInitialGradeId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('0');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    const loadRegistry = async () => {
      try {
        const [gradesSnap, subjectsSnap] = await Promise.all([
          getDocs(query(collection(db, "grades"), orderBy("name", "asc"))),
          getDocs(query(collection(db, "subjects"), orderBy("name", "asc")))
        ]);

        const gradesList = gradesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const subjectsList = subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        setGrades(gradesList);
        setSubjects(subjectsList);

        if (classId) {
          const classSnap = await getDoc(doc(db, 'classes', classId));
          if (classSnap.exists()) {
            const data = classSnap.data();
            setName(data.name || '');
            setSubjectId(data.subjectId || '');
            setGradeId(data.gradeId || '');
            setInitialGradeId(data.gradeId || '');
            setMonthlyFee(String(data.monthlyFee || '0'));
            setSchedules(data.schedules || []);
            setStatus(data.status || 'active');
          }
        } else {
          setSchedules([{ dayOfWeek: 'Monday', startTime: '08:00', endTime: '10:00', room: 'Room 01' }]);
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Registry Error', 'Failed to synchronize institutional data');
      } finally {
        setLoading(false);
      }
    };
    loadRegistry();
  }, [classId]);

  // Auto-generate class name
  useEffect(() => {
    if (gradeId && subjectId && teacherData?.name) {
      const g = grades.find(x => x.id === gradeId);
      const s = subjects.find(x => x.id === subjectId);
      if (g && s) {
        setName(`${g.name} • ${s.name} (${teacherData.name})`);
      }
    }
  }, [gradeId, subjectId, teacherData, grades, subjects]);

  const addSchedule = () => {
    setSchedules([...schedules, { dayOfWeek: 'Monday', startTime: '08:00', endTime: '10:00', room: 'Room 01' }]);
  };

  const removeSchedule = (index: number) => {
    if (schedules.length > 1) {
      const newSchedules = schedules.filter((_, i) => i !== index);
      setSchedules(newSchedules);
    }
  };

  const updateSchedule = (index: number, field: string, value: string) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };

  // Reset Subject when Grade changes (Web app rule)
  useEffect(() => {
    if (!classId) { // Only for new classes to stay safe
        setSubjectId('');
    }
  }, [gradeId]);

  // Filtering Logic (Teacher Web Portal Rules)
  const filteredGrades = grades.filter(g => {
    if (!teacherData?.grades) return true;
    return teacherData.grades.includes(g.name);
  });

  const filteredSubjects = subjects.filter(s => {
    if (!teacherData?.subjects) return true;
    // Rule: Subjects should be from the teacher's authorized curriculum
    return teacherData.subjects.includes(s.name);
  });

  const handleSave = async () => {
    if (!gradeId || !subjectId || !monthlyFee || schedules.length === 0) {
      Alert.alert('Validation Error', 'Curriculum setup and timing details are required.');
      return;
    }

    setSaving(true);
    const batch = writeBatch(db);
    try {
      const selectedSubject = subjects.find(s => s.id === subjectId);
      const selectedGrade = grades.find(g => g.id === gradeId);

      const classData = {
        name,
        subjectId,
        subject: selectedSubject?.name || "",
        gradeId,
        grade: selectedGrade?.name || "",
        teacherId: teacherData.id,
        teacherName: teacherData.name,
        monthlyFee: Number(monthlyFee),
        status,
        schedules,
        updatedAt: serverTimestamp()
      };

      if (classId) {
        // Handle grade count changes if grade level is modified
        if (initialGradeId !== gradeId) {
          if (initialGradeId) {
            batch.update(doc(db, "grades", initialGradeId), { classCount: increment(-1) });
          }
          batch.update(doc(db, "grades", gradeId), { classCount: increment(1) });
        }
        batch.update(doc(db, 'classes', classId), classData);
      } else {
        const classRef = doc(collection(db, 'classes'));
        batch.update(doc(db, "grades", gradeId), { classCount: increment(1) });
        batch.set(classRef, {
          ...classData,
          studentCount: 0,
          createdAt: serverTimestamp()
        });
      }

      await batch.commit();
      Alert.alert('Confirmed', `Academic session ${classId ? 'adjusted' : 'authorized'} successfully.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Process Failed', 'Internal synchronization error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#64748B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{classId ? 'Adjust Schedule' : 'Schedule New Class'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>CURRICULUM SETUP</Text>
            <BookOpen size={16} color="#94A3B8" />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Class Display Name (Identity)</Text>
            <View style={[styles.input, { backgroundColor: '#F1F5F9', borderBottomColor: '#E2E8F0' }]}>
              <Text style={{ color: '#64748B', fontWeight: '800' }}>{name || "Pick Grade and Subject First..."}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.inputLabel}>Grade Level *</Text>
              <View style={styles.pickerWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContainer}>
                  {filteredGrades.map(g => (
                    <TouchableOpacity 
                      key={g.id} 
                      style={[styles.chip, gradeId === g.id && styles.chipActive]}
                      onPress={() => setGradeId(g.id)}
                    >
                      <Text style={[styles.chipText, gradeId === g.id && styles.chipTextActive]}>{g.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>

          <View style={[styles.inputGroup, !gradeId && { opacity: 0.5 }]}>
            <Text style={styles.inputLabel}>Academic Subject * {!gradeId && "(Pick Grade First)"}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.chipContainer}
              scrollEnabled={!!gradeId}
            >
              {filteredSubjects.map(s => (
                <TouchableOpacity 
                  key={s.id} 
                  disabled={!gradeId}
                  style={[styles.chip, subjectId === s.id && styles.chipActive]}
                  onPress={() => setSubjectId(s.id)}
                >
                  <Text style={[styles.chipText, subjectId === s.id && styles.chipTextActive]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Monthly Fee (LKR)</Text>
            <View style={styles.feeInput}>
              <CreditCard size={18} color="#94A3B8" />
              <TextInput 
                style={styles.textInput} 
                keyboardType="numeric"
                value={monthlyFee}
                onChangeText={setMonthlyFee}
                placeholder="2500"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>TIMING & LOCATION</Text>
            <TouchableOpacity style={styles.addButton} onPress={addSchedule}>
              <Plus size={16} color="#6366F1" />
              <Text style={styles.addButtonText}>ADD SLOT</Text>
            </TouchableOpacity>
          </View>

          {schedules.map((slot, idx) => (
            <View key={idx} style={styles.scheduleCard}>
               <View style={styles.slotHeader}>
                  <View style={styles.slotType}>
                    <Clock size={14} color="#64748B" />
                    <Text style={styles.slotTitle}>Recurring Session #{idx + 1}</Text>
                  </View>
                  {schedules.length > 1 && (
                    <TouchableOpacity onPress={() => removeSchedule(idx)}>
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
               </View>

               <View style={styles.dayPicker}>
                  {DAYS.map(day => (
                    <TouchableOpacity 
                      key={day} 
                      style={[styles.dayOption, slot.dayOfWeek.toLowerCase() === day.toLowerCase() && styles.dayOptionActive]}
                      onPress={() => updateSchedule(idx, 'dayOfWeek', day)}
                    >
                      <Text style={[styles.dayOptionText, slot.dayOfWeek.toLowerCase() === day.toLowerCase() && styles.dayOptionTextActive]}>
                        {day.charAt(0)}
                      </Text>
                    </TouchableOpacity>
                  ))}
               </View>

               <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Start Time</Text>
                    <TextInput 
                      style={styles.textInputThin} 
                      value={slot.startTime}
                      onChangeText={(v) => updateSchedule(idx, 'startTime', v)}
                      placeholder="08:00"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.inputLabel}>End Time</Text>
                    <TextInput 
                      style={styles.textInputThin} 
                      value={slot.endTime}
                      onChangeText={(v) => updateSchedule(idx, 'endTime', v)}
                      placeholder="10:00"
                    />
                  </View>
               </View>

               <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Hall / Room Assignment</Text>
                  <View style={styles.locationInput}>
                    <MapPin size={14} color="#94A3B8" />
                    <TextInput 
                      style={[styles.textInputThin, { borderBottomWidth: 0, flex: 1 }]} 
                      value={slot.room}
                      onChangeText={(v) => updateSchedule(idx, 'room', v)}
                      placeholder="Main Hall"
                    />
                  </View>
               </View>
            </View>
          ))}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
         <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={saving}
         >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.saveButtonText}>{classId ? 'COMMIT ADJUSTMENTS' : 'AUTHORIZE CLASS'}</Text>
                <Save size={20} color="#fff" />
              </>
            )}
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 24,
    backgroundColor: '#FBFBFE',
  },
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#F1F5F9',
    padding: 14,
    borderRadius: 12,
  },
  textInput: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
    flex: 1,
    marginLeft: 10,
  },
  textInputThin: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#F1F5F9',
    padding: 12,
  },
  feeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 12,
    height: 54,
  },
  pickerWrapper: {
    marginBottom: 0,
  },
  hiddenInput: {
    height: 0,
    width: 0,
    opacity: 0,
  },
  chipContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6366F1',
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  slotType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  dayPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dayOption: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dayOptionActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  dayOptionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  dayOptionTextActive: {
    color: '#fff',
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#F1F5F9',
    paddingLeft: 12,
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
  saveButton: {
    backgroundColor: '#0F172A',
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  }
});

export default ClassManageScreen;
