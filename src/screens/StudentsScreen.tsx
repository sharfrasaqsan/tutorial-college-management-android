import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Dimensions
} from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Users, Search, ChevronRight, ChevronLeft, Phone, BookOpen, Layers } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const StudentsScreen = () => {
  const { teacherData } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    if (!teacherData?.id) return;
    setLoading(true);
    try {
      // 1. Get all classes for this teacher
      const classesQ = query(
        collection(db, "classes"),
        where("teacherId", "==", teacherData.id)
      );
      const classesSnap = await getDocs(classesQ);
      const classesList = classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClasses(classesList);
      
      if (classesList.length > 0) {
        setActiveTab(classesList[0].id);
      }

      // 2. Get unique grades from classes
      const grades = Array.from(new Set(classesList.map((c: any) => c.grade)));

      if (grades.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // 3. Fetch students in those grades
      const allStudents: any[] = [];
      for (const grade of grades) {
        const studentsQ = query(
          collection(db, "students"),
          where("grade", "==", grade)
        );
        const studentsSnap = await getDocs(studentsQ);
        studentsSnap.docs.forEach(doc => {
          allStudents.push({ id: doc.id, ...doc.data() });
        });
      }

      // De-duplicate students
      const uniqueStudents = Array.from(new Map(allStudents.map(s => [s.id, s])).values());
      setStudents(uniqueStudents.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Data Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teacherData]);

  const activeClass = useMemo(() => {
    return classes.find(c => c.id === activeTab);
  }, [activeTab, classes]);

  const filteredStudents = useMemo(() => {
    if (!activeClass) return [];
    
    return students.filter(s => {
      const matchesGrade = s.grade === activeClass.grade;
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGrade && matchesSearch;
    });
  }, [students, activeClass, searchQuery]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#64748B" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Student Directory</Text>
          <Text style={styles.headerSubtitle}>{classes.length} ACTIVE SUBJECTS</Text>
        </View>
      </View>

      {/* Subject Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabsContainer}
        >
          {classes.map((cls) => (
            <TouchableOpacity 
              key={cls.id} 
              style={[styles.tab, activeTab === cls.id && styles.activeTab]}
              onPress={() => setActiveTab(cls.id)}
            >
              <Text style={[styles.tabText, activeTab === cls.id && styles.activeTabText]}>
                {cls.subject}
              </Text>
              <Text style={[styles.tabSubtext, activeTab === cls.id && styles.activeTabSubtext]}>
                {cls.grade}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search and List */}
      <View style={styles.listSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Search size={18} color="#94A3B8" />
            <TextInput 
              style={styles.searchInput}
              placeholder={`Search in ${activeClass?.subject || 'students'}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.listHeader}>
             <Layers size={14} color="#6366F1" />
             <Text style={styles.listTitle}>
               {activeClass?.subject} Students ({filteredStudents.length})
             </Text>
          </View>

          {filteredStudents.length === 0 ? (
            <View style={styles.emptyState}>
               <Users size={48} color="#E2E8F0" />
               <Text style={styles.emptyText}>No students found in this subject.</Text>
            </View>
          ) : (
            filteredStudents.map((s) => (
              <View key={s.id} style={styles.studentCard}>
                <View style={styles.studentAvatar}>
                  <Text style={styles.avatarText}>{s.name.charAt(0)}</Text>
                </View>
                
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{s.name}</Text>
                  <Text style={styles.schoolText}>{s.schoolName}</Text>
                  
                  <View style={styles.contactRow}>
                    <Phone size={10} color="#94A3B8" />
                    <Text style={styles.contactText}>{s.parentPhone || 'No contact info'}</Text>
                  </View>
                </View>
                
                <TouchableOpacity style={styles.actionButton}>
                  <ChevronRight size={20} color="#CBD5E1" />
                </TouchableOpacity>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
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
    backgroundColor: '#fff',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  tabsWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minWidth: 120,
  },
  activeTab: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  activeTabText: {
    color: '#fff',
  },
  tabSubtext: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },
  activeTabSubtext: {
    color: 'rgba(255,255,255,0.7)',
  },
  listSection: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    padding: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
  },
  studentAvatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#6366F1',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 16,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 2,
  },
  schoolText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  actionButton: {
    paddingLeft: 10,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
  }
});

export default StudentsScreen;
