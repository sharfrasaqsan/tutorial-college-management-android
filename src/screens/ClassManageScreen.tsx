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
import { ChevronLeft, Plus, Trash2, Clock, MapPin, Save, BookOpen, CreditCard, ChevronDown, Calendar as CalendarIcon } from 'lucide-react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ClassManageScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ManageClass'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { teacherData, isAdmin } = useAuth();
  const { classId, teacherId: paramTeacherId, teacherName: paramTeacherName } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Resolve Target Faculty (Param > Auth)
  const targetTeacherId = paramTeacherId || teacherData?.id || "";
  const targetTeacherName = paramTeacherName || teacherData?.name || "Teacher";
  
  // Data lists
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [initialGradeId, setInitialGradeId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [groupSuffix, setGroupSuffix] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('0');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [syllabusCompleted, setSyllabusCompleted] = useState(false);
  const [sessionsPerCycle, setSessionsPerCycle] = useState('8');
  const [completedSessions, setCompletedSessions] = useState(0);

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
            setSyllabusCompleted(data.syllabusCompleted || false);
            setSessionsPerCycle(String(data.sessionsPerCycle || '8'));
            setCompletedSessions(data.completedSessions || 0);
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
    if (gradeId && subjectId && targetTeacherName) {
      const g = grades.find(x => x.id === gradeId);
      const s = subjects.find(x => x.id === subjectId);
      if (g && s) {
        const suffix = groupSuffix.trim() ? ` - ${groupSuffix.trim()}` : "";
        setName(`${g.name} • ${s.name}${suffix} (${targetTeacherName})`);
      }
    }
  }, [gradeId, subjectId, targetTeacherName, grades, subjects, groupSuffix]);

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
    try {
      // 1. Fetch fresh data for conflict validation
      const classesSnap = await getDocs(collection(db, "classes"));
      const currentClasses = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      const selectedSubject = subjects.find(s => s.id === subjectId);
      const selectedGrade = grades.find(g => g.id === gradeId);

      const hasOverlap = (s1: string, e1: string, s2: string, e2: string) => {
          return s1 < e2 && s2 < e1;
      };

      // Case 0: Internal Conflict Prevention (within the same new class)
      for (let i = 0; i < schedules.length; i++) {
        for (let j = i + 1; j < schedules.length; j++) {
            const slot1 = schedules[i];
            const slot2 = schedules[j];
            if (slot1.dayOfWeek.toLowerCase() === slot2.dayOfWeek.toLowerCase()) {
                if (hasOverlap(slot1.startTime, slot1.endTime, slot2.startTime, slot2.endTime)) {
                    Alert.alert('Scheduling Error', `Local Overlap: Slots ${i + 1} and ${j + 1} conflict on ${slot1.dayOfWeek}.`);
                    setSaving(false);
                    return;
                }
            }
        }
      }

      // Case 1: Identical Name Check
      for (const existing of currentClasses) {
          if (classId && existing.id === classId) continue;
          if (existing.name.toLowerCase() === name.toLowerCase()) {
              Alert.alert('Protocol Conflict', `A session already exists with the exact same identifier: "${existing.name}". Please use a Group Suffix to distinguish parallel cohorts.`);
              setSaving(false);
              return;
          }

          // Case 2-4: Schedule Conflicts
          if (existing.status !== 'active') continue;
          for (const newSlot of schedules) {
            for (const existingSlot of (existing.schedules || [])) {
              if (newSlot.dayOfWeek.toLowerCase() === existingSlot.dayOfWeek.toLowerCase()) {
                if (hasOverlap(newSlot.startTime, newSlot.endTime, existingSlot.startTime, existingSlot.endTime)) {
                   // Room Conflict
                   if (newSlot.room.trim().toLowerCase() === existingSlot.room.trim().toLowerCase()) {
                     Alert.alert('Room Occupied', `${newSlot.room} is used by "${existing.name}" on ${newSlot.dayOfWeek} at ${existingSlot.startTime}-${existingSlot.endTime}`);
                     setSaving(false);
                     return;
                   }
                   // Teacher Conflict
                   if (targetTeacherId === existing.teacherId) {
                     Alert.alert('Faculty Conflict', `${targetTeacherName} is already assigned to "${existing.name}" on ${newSlot.dayOfWeek} at ${existingSlot.startTime}-${existingSlot.endTime}`);
                     setSaving(false);
                     return;
                   }
                   // Grade Conflict
                   if (gradeId === existing.gradeId) {
                     Alert.alert('Grade Overlap', `${selectedGrade?.name || 'This grade'} already has "${existing.name}" scheduled at this time.`);
                     setSaving(false);
                     return;
                   }
                }
              }
            }
          }
      }

      const batch = writeBatch(db);

      // Sort schedules chronologically before saving
      const sortedSchedules = [...schedules].sort((a, b) => {
          const dayOrder: Record<string, number> = { 
              "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3, 
              "friday": 4, "saturday": 5, "sunday": 6 
          };
          const dayCompare = dayOrder[a.dayOfWeek.toLowerCase()] - dayOrder[b.dayOfWeek.toLowerCase()];
          if (dayCompare !== 0) return dayCompare;
          return (a.startTime || "").localeCompare(b.startTime || "");
      });

      const classData = {
        name,
        subjectId,
        subject: selectedSubject?.name || "",
        gradeId,
        grade: selectedGrade?.name || "",
        teacherId: targetTeacherId,
        teacherName: targetTeacherName,
        monthlyFee: Number(monthlyFee),
        sessionsPerCycle: Number(sessionsPerCycle),
        status,
        syllabusCompleted,
        schedules: sortedSchedules,
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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{classId ? 'Adjustment Protocol' : 'Unit Registration'}</Text>
          {classId && (
            <TouchableOpacity onPress={() => (navigation as any).navigate('ClassSessions', { classId, className: name })}>
              <Text style={styles.historyLink}>LEDGER LOGS</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>UNIT IDENTITY</Text>
            <BookOpen size={16} color="#94A3B8" />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Unit Identifier</Text>
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
            <Text style={styles.inputLabel}>Group / Section ID (Optional)</Text>
            <TextInput 
              style={styles.textInput} 
              value={groupSuffix}
              onChangeText={setGroupSuffix}
              placeholder="e.g. Group A, Evening Bat"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.inputLabel}>Fiscal Rate (LKR)</Text>
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

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Sessions/Cycle</Text>
              <View style={styles.feeInput}>
                <CalendarIcon size={18} color="#94A3B8" />
                <TextInput 
                  style={styles.textInput} 
                  keyboardType="numeric"
                  value={sessionsPerCycle}
                  onChangeText={setSessionsPerCycle}
                  placeholder="8"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>OPERATIONAL STATUS</Text>
            <Layers size={16} color="#94A3B8" />
          </View>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricVal}>{completedSessions}</Text>
              <Text style={styles.metricLab}>SESSIONS LOGGED</Text>
            </View>
            <View style={styles.statusToggleContainer}>
               <TouchableOpacity 
                style={[styles.statusToggle, status === 'active' ? styles.statusActive : styles.statusInactive]}
                onPress={() => setStatus(status === 'active' ? 'inactive' : 'active')}
               >
                 <Text style={styles.statusToggleText}>{status === 'active' ? 'UNIT ACTIVE' : 'UNIT SUSPENDED'}</Text>
               </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.syllabusCard, syllabusCompleted && styles.syllabusCardActive]}
            onPress={() => setSyllabusCompleted(!syllabusCompleted)}
          >
            <View style={styles.syllabusInfo}>
               <Text style={[styles.syllabusTitle, syllabusCompleted && styles.syllabusTitleActive]}>Syllabus Completion</Text>
               <Text style={styles.syllabusSub}>Archive class in yearly focus</Text>
            </View>
            <View style={[styles.syllabusToggle, syllabusCompleted && styles.syllabusToggleActive]}>
               {syllabusCompleted && <View style={styles.toggleDot} />}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>SCHEDULING PROTOCOL</Text>
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
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: '#0F172A' }]} 
            onPress={handleSave} 
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Save size={18} color="#fff" />
                <Text style={styles.saveButtonText}>{classId ? 'FINALIZE ADJUSTMENT' : 'AUTHORIZE REGISTRATION'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  headerInfo: {
    flex: 1,
  },
  historyLink: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 1,
    marginTop: 4,
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
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricLab: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 4,
    letterSpacing: 1,
  },
  statusToggleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  statusToggle: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  statusInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusToggleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 1,
  },
  syllabusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  syllabusCardActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  syllabusInfo: {
    flex: 1,
  },
  syllabusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  syllabusTitleActive: {
    color: '#0369A1',
  },
  syllabusSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  syllabusToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    padding: 2,
    justifyContent: 'center',
  },
  syllabusToggleActive: {
    backgroundColor: '#0EA5E9',
    alignItems: 'flex-end',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default ClassManageScreen;
