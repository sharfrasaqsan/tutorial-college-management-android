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
  writeBatch, 
  increment 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  ChevronLeft, 
  User, 
  BookOpen, 
  Phone, 
  MapPin, 
  Shield, 
  CreditCard,
  Check,
  Plus,
  Trash2
} from 'lucide-react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const StudentManageScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ManageStudent'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { studentId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'academic' | 'fiscal'>('identity');

  // Registry Data
  const [grades, setGrades] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // State: Identity
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [parentName, setParentName] = useState('');

  // State: Academic
  const [gradeId, setGradeId] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  // State: Fiscal
  const [admissionFee, setAdmissionFee] = useState('0');
  const [isAdmissionPaid, setIsAdmissionPaid] = useState(true);

  useEffect(() => {
    const loadRegistry = async () => {
      try {
        const [gradesSnap, classesSnap] = await Promise.all([
          getDocs(query(collection(db, "grades"), orderBy("name", "asc"))),
          getDocs(query(collection(db, "classes"), orderBy("name", "asc")))
        ]);

        setGrades(gradesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setClasses(classesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        if (studentId) {
          const sSnap = await getDoc(doc(db, 'students', studentId));
          if (sSnap.exists()) {
            const data = sSnap.data();
            setName(data.name || '');
            setPhone(data.phone || '');
            setAddress(data.address || '');
            setSchoolName(data.schoolName || '');
            setParentName(data.parentName || '');
            setGradeId(data.gradeId || '');
            setSelectedClasses(data.enrolledClasses || []);
            setAdmissionFee(String(data.admissionFee || '0'));
          }
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Registry Error', 'Failed to synchronize institutional data');
      } finally {
        setLoading(false);
      }
    };
    loadRegistry();
  }, [studentId]);

  const handleSave = async () => {
    if (!name || !gradeId) {
      Alert.alert('Validation Error', 'Identity and Grade assignment are required for registry updates.');
      return;
    }

    setSaving(true);
    const batch = writeBatch(db);
    try {
      const selectedGrade = grades.find(g => g.id === gradeId);
      
      const studentData = {
        name,
        phone,
        address,
        schoolName,
        parentName,
        gradeId,
        grade: selectedGrade?.name || '',
        enrolledClasses: selectedClasses,
        admissionFee: Number(admissionFee),
        updatedAt: serverTimestamp()
      };

      let finalStudentId = studentId;

      if (studentId) {
        // Update Existing
        batch.update(doc(db, 'students', studentId), studentData);
      } else {
        // Create New
        const newRef = doc(collection(db, 'students'));
        finalStudentId = newRef.id;
        
        batch.set(newRef, {
          ...studentData,
          studentId: `STU${Math.floor(1000 + Math.random() * 9000)}`, // Basic ID generation
          status: 'active',
          createdAt: serverTimestamp()
        });

        // 1. Update Grade class count (student count)
        batch.update(doc(db, 'grades', gradeId), { studentCount: increment(1) });

        // 2. Update Class student counts
        selectedClasses.forEach(cId => {
          batch.update(doc(db, 'classes', cId), { studentCount: increment(1) });
        });

        // 3. Generate Admission Fee Record if paid
        if (Number(admissionFee) > 0 && isAdmissionPaid) {
          const payRef = doc(collection(db, 'payments'));
          batch.set(payRef, {
            studentId: finalStudentId,
            studentName: name,
            amount: Number(admissionFee),
            month: new Date().toISOString().substring(0, 7),
            type: 'admission',
            status: 'paid',
            method: 'Cash',
            createdAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      Alert.alert('Success', `Student registry ${studentId ? 'updated' : 'finalized'} successfully.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Process Error', 'Failed to synchronize with cloud registry.');
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

  const filteredClasses = classes.filter(c => c.gradeId === gradeId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#64748B" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{studentId ? 'Registry Adjustment' : 'Unit Admission'}</Text>
          <Text style={styles.headerSubtitle}>ADMINISTRATIVE PROTOCOL</Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        {['identity', 'academic', 'fiscal'].map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'identity' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>IDENTITY PROTOCOL</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput 
                style={styles.input} 
                value={name} 
                onChangeText={setName} 
                placeholder="REGISTRY NAME"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Parent/Guardian Contact</Text>
              <TextInput 
                style={styles.input} 
                value={phone} 
                onChangeText={setPhone} 
                placeholder="+94 XXX XXX XXXX"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Home Address</Text>
              <TextInput 
                style={styles.input} 
                value={address} 
                onChangeText={setAddress} 
                placeholder="REGISTRY RESIDENCE"
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Day School Name</Text>
              <TextInput 
                style={styles.input} 
                value={schoolName} 
                onChangeText={setSchoolName} 
                placeholder="INSTITUTIONAL AFFILIATION"
              />
            </View>
          </View>
        )}

        {activeTab === 'academic' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACADEMIC PLACEMENT</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Assigned Grade</Text>
              <View style={styles.pickerContainer}>
                {grades.map(g => (
                  <TouchableOpacity 
                    key={g.id} 
                    style={[styles.pickerItem, gradeId === g.id && styles.pickerItemActive]}
                    onPress={() => setGradeId(g.id)}
                  >
                    <Text style={[styles.pickerText, gradeId === g.id && styles.pickerTextActive]}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {gradeId ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unit Enrollment</Text>
                {filteredClasses.length === 0 ? (
                  <Text style={styles.noDataText}>No active units found for this grade.</Text>
                ) : (
                  filteredClasses.map(c => (
                    <TouchableOpacity 
                      key={c.id} 
                      style={[styles.classCard, selectedClasses.includes(c.id) && styles.classCardActive]}
                      onPress={() => {
                        if (selectedClasses.includes(c.id)) {
                          setSelectedClasses(selectedClasses.filter(id => id !== c.id));
                        } else {
                          setSelectedClasses([...selectedClasses, c.id]);
                        }
                      }}
                    >
                      <View style={styles.classInfo}>
                        <BookOpen size={16} color={selectedClasses.includes(c.id) ? "#fff" : "#6366F1"} />
                        <Text style={[styles.classTitle, selectedClasses.includes(c.id) && styles.classTitleActive]}>{c.name}</Text>
                      </View>
                      {selectedClasses.includes(c.id) && <Check size={16} color="#fff" />}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : (
              <View style={styles.placeholderBox}>
                <Shield size={40} color="#E2E8F0" />
                <Text style={styles.placeholderText}>SELECT GRADE TO VIEW UNITS</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'fiscal' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FISCAL RECEIPT</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Admission Fee (LKR)</Text>
              <TextInput 
                style={styles.input} 
                value={admissionFee} 
                onChangeText={setAdmissionFee} 
                keyboardType="numeric"
                placeholder="0.00"
              />
            </View>

            <TouchableOpacity 
              style={styles.statusToggle} 
              onPress={() => setIsAdmissionPaid(!isAdmissionPaid)}
            >
              <View style={[styles.checkbox, isAdmissionPaid && styles.checkboxActive]}>
                {isAdmissionPaid && <Check size={14} color="#fff" />}
              </View>
              <Text style={styles.statusLabel}>MARK AS PAID IN FISCAL LEDGER</Text>
            </TouchableOpacity>

            <View style={styles.policyCard}>
              <CreditCard size={20} color="#6366F1" />
              <Text style={styles.policyText}>Admission fees are recorded as non-refundable institutional revenue upon registry finalization.</Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave} 
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.saveButtonText}>
              {studentId ? 'AUTHORIZE ADJUSTMENT' : 'FINALIZE ADMISSION'}
            </Text>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTab: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
  },
  activeTabText: {
    color: '#fff',
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
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerItemActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  pickerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  pickerTextActive: {
    color: '#6366F1',
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  classCardActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  classTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  classTitleActive: {
    color: '#fff',
  },
  noDataText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
    padding: 20,
  },
  placeholderBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
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

export default StudentManageScreen;
