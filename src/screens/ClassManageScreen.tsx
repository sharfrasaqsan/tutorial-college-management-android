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
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Plus, Trash2, Clock, MapPin, Save, BookOpen } from 'lucide-react-native';
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

  const [loading, setLoading] = useState(!!classId);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    if (classId) {
      const fetchClass = async () => {
        try {
          const docRef = doc(db, 'classes', classId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setName(data.name || '');
            setSubject(data.subject || '');
            setGrade(data.grade || '');
            setSchedules(data.schedules || []);
          }
        } catch (error) {
          console.error(error);
          Alert.alert('Error', 'Failed to load class details');
        } finally {
          setLoading(false);
        }
      };
      fetchClass();
    }
  }, [classId]);

  const addSchedule = () => {
    setSchedules([...schedules, { dayOfWeek: 'Monday', startTime: '08:00', endTime: '10:00', room: 'Room 01' }]);
  };

  const removeSchedule = (index: number) => {
    const newSchedules = schedules.filter((_, i) => i !== index);
    setSchedules(newSchedules);
  };

  const updateSchedule = (index: number, field: string, value: string) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };

  const handleSave = async () => {
    if (!name || !subject || !grade || schedules.length === 0) {
      Alert.alert('Validation Error', 'Please fill in all fields and add at least one schedule slot.');
      return;
    }

    setSaving(true);
    try {
      const classData = {
        name,
        subject,
        grade,
        teacherId: teacherData.id,
        status: 'active',
        schedules,
        updatedAt: serverTimestamp()
      };

      if (classId) {
        await updateDoc(doc(db, 'classes', classId), classData);
      } else {
        await addDoc(collection(db, 'classes'), {
          ...classData,
          createdAt: serverTimestamp()
        });
      }

      Alert.alert('Success', `Class ${classId ? 'updated' : 'added'} successfully`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save class');
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
        <Text style={styles.headerTitle}>{classId ? 'Edit Class' : 'New Academic Class'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BASIC INFORMATION</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Class Display Name</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. O/L Physics Group A" 
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.inputLabel}>Subject</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Physics" 
                value={subject}
                onChangeText={setSubject}
              />
            </View>
            <View style={[styles.inputGroup, { width: 100 }]}>
              <Text style={styles.inputLabel}>Grade</Text>
              <TextInput 
                style={styles.input} 
                placeholder="G-11" 
                value={grade}
                onChangeText={setGrade}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>RECURRING SCHEDULE</Text>
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
                    <Text style={styles.slotTitle}>Slot #{idx + 1}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeSchedule(idx)}>
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
               </View>

               <View style={styles.dayPicker}>
                  {DAYS.map(day => (
                    <TouchableOpacity 
                      key={day} 
                      style={[styles.dayOption, slot.dayOfWeek === day && styles.dayOptionActive]}
                      onPress={() => updateSchedule(idx, 'dayOfWeek', day)}
                    >
                      <Text style={[styles.dayOptionText, slot.dayOfWeek === day && styles.dayOptionTextActive]}>
                        {day.charAt(0)}
                      </Text>
                    </TouchableOpacity>
                  ))}
               </View>

               <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Start Time</Text>
                    <TextInput 
                      style={styles.input} 
                      value={slot.startTime}
                      onChangeText={(v) => updateSchedule(idx, 'startTime', v)}
                      placeholder="08:00"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                    <Text style={styles.inputLabel}>End Time</Text>
                    <TextInput 
                      style={styles.input} 
                      value={slot.endTime}
                      onChangeText={(v) => updateSchedule(idx, 'endTime', v)}
                      placeholder="10:00"
                    />
                  </View>
               </View>

               <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Classroom / Hall</Text>
                  <View style={styles.locationInput}>
                    <MapPin size={14} color="#94A3B8" />
                    <TextInput 
                      style={[styles.input, { borderBottomWidth: 0, flex: 1, height: 40 }]} 
                      value={slot.room}
                      onChangeText={(v) => updateSchedule(idx, 'room', v)}
                      placeholder="Room 01"
                    />
                  </View>
               </View>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
         <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={saving}
         >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.saveButtonText}>{classId ? 'COMMIT CHANGES' : 'CREATE NEW CLASS'}</Text>
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
    letterSpacing: 1.5,
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
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#F1F5F9',
    padding: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
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
