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
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  serverTimestamp, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Phone, 
  BookOpen, 
  Layers, 
  Check, 
  Shield 
} from 'lucide-react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const TeacherManageScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ManageTeacher'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { teacherId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data lists
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // State: Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // State: Selection
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [gradesSnap, subjectsSnap] = await Promise.all([
          getDocs(query(collection(db, "grades"), orderBy("name", "asc"))),
          getDocs(query(collection(db, "subjects"), orderBy("name", "asc")))
        ]);

        setGrades(gradesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSubjects(subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        if (teacherId) {
          const tSnap = await getDoc(doc(db, 'teachers', teacherId));
          if (tSnap.exists()) {
            const data = tSnap.data();
            setName(data.name || '');
            setEmail(data.email || '');
            setPhone(data.phone || '');
            setSelectedGrades(data.grades || []);
            setSelectedSubjects(data.subjects || []);
          }
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [teacherId]);

  const handleSave = async () => {
    if (!name || !email) {
      Alert.alert('Error', 'Name and Email are required.');
      return;
    }

    setSaving(true);
    try {
      const teacherData = {
        name,
        email: email.toLowerCase(),
        phone,
        grades: selectedGrades,
        subjects: selectedSubjects,
        status: 'active',
        updatedAt: serverTimestamp()
      };

      if (teacherId) {
        await updateDoc(doc(db, 'teachers', teacherId), teacherData);
      } else {
        const newRef = doc(collection(db, 'teachers'));
        await setDoc(newRef, {
          ...teacherData,
          createdAt: serverTimestamp(),
          role: 'teacher'
        });
      }

      Alert.alert('Success', `Teacher ${teacherId ? 'updated' : 'added'} successfully.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const toggleGrade = (gradeName: string) => {
    if (selectedGrades.includes(gradeName)) {
      setSelectedGrades(selectedGrades.filter(g => g !== gradeName));
    } else {
      setSelectedGrades([...selectedGrades, gradeName]);
    }
  };

  const toggleSubject = (subjectName: string) => {
    if (selectedSubjects.includes(subjectName)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== subjectName));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectName]);
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#64748B" />
        </TouchableOpacity>
        
        <LinearGradient
          colors={name ? ['#6366F1', '#4F46E5'] : ['#94A3B8', '#64748B']}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarText}>{name?.charAt(0) || '?'}</Text>
        </LinearGradient>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{name || (teacherId ? 'Loading...' : 'New Teacher')}</Text>
          <View style={styles.roleBadge}>
             <Text style={styles.roleText}>TEACHER</Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: name ? '#10B981' : '#CBD5E1' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TEACHER INFO</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput 
              style={styles.input} 
              value={name} 
              onChangeText={setName} 
              placeholder="Enter name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput 
              style={styles.input} 
              value={email} 
              onChangeText={setEmail} 
              placeholder="example@mail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!teacherId}
            />
            {teacherId && <Text style={styles.helperText}>Email cannot be changed after registration.</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput 
              style={styles.input} 
              value={phone} 
              onChangeText={setPhone} 
              placeholder="+94 XXX XXX XXXX"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TEACHING DETAILS</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Assigned Grades</Text>
            <View style={styles.chipContainer}>
              {grades.map(g => (
                <TouchableOpacity 
                  key={g.id} 
                  style={[styles.chip, selectedGrades.includes(g.name) && styles.chipActive]}
                  onPress={() => toggleGrade(g.name)}
                >
                  <Text style={[styles.chipText, selectedGrades.includes(g.name) && styles.chipTextActive]}>{g.name}</Text>
                  {selectedGrades.includes(g.name) && <Check size={12} color="#fff" style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Assigned Subjects</Text>
            <View style={styles.chipContainer}>
              {subjects.map(s => (
                <TouchableOpacity 
                  key={s.id} 
                  style={[styles.chip, selectedSubjects.includes(s.name) && styles.chipActive]}
                  onPress={() => toggleSubject(s.name)}
                >
                  <Text style={[styles.chipText, selectedSubjects.includes(s.name) && styles.chipTextActive]}>{s.name}</Text>
                  {selectedSubjects.includes(s.name) && <Check size={12} color="#fff" style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.policyCard}>
          <Shield size={20} color="#6366F1" />
          <Text style={styles.policyText}>Teachers will have access to mark attendance and view their schedules.</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave} 
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.saveButtonText}>
              {teacherId ? 'SAVE CHANGES' : 'ADD TEACHER'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  roleBadge: {
    marginTop: 4,
    backgroundColor: '#EEF2FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollContent: {
    padding: 24,
    backgroundColor: '#F8FAFC',
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
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  helperText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 6,
    marginLeft: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#fff',
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  policyText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
    lineHeight: 16,
  },
  footer: {
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  saveButton: {
    height: 60,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  }
});

export default TeacherManageScreen;
