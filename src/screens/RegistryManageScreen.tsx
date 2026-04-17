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
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  orderBy, 
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Edit3, 
  Layers, 
  BookOpen, 
  Shield 
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const RegistryManageScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<'grades' | 'subjects'>('grades');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [grades, setGrades] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const fetchRegistry = async () => {
    setLoading(true);
    try {
      const gSnap = await getDocs(query(collection(db, "grades"), orderBy("name", "asc")));
      const sSnap = await getDocs(query(collection(db, "subjects"), orderBy("name", "asc")));
      
      setGrades(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSubjects(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  const handleSave = async () => {
    if (!inputValue.trim()) return;
    
    setProcessing(true);
    try {
      const collectionName = activeTab;
      if (editId) {
        await updateDoc(doc(db, collectionName, editId), {
          name: inputValue.trim(),
          updatedAt: serverTimestamp()
        });
      } else {
        const newRef = doc(collection(db, collectionName));
        await setDoc(newRef, {
          name: inputValue.trim(),
          createdAt: serverTimestamp(),
          classCount: 0,
          studentCount: 0
        });
      }
      setIsModalOpen(false);
      setInputValue('');
      setEditId(null);
      fetchRegistry();
    } catch (error) {
      console.error(error);
      Alert.alert('Protocol Error', 'Institutional sync failed.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Atomic Deletion Protocol',
      `Are you sure you want to remove "${name}"? This will not affect existing classes but will prevent new registrations for this entity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed Deletion', 
          style: 'destructive', 
          onPress: async () => {
            setProcessing(true);
            try {
              await deleteDoc(doc(db, activeTab, id));
              fetchRegistry();
            } catch (e) {
              console.error(e);
            } finally {
              setProcessing(false);
            }
          } 
        }
      ]
    );
  };

  const openEditor = (item?: any) => {
    if (item) {
      setEditId(item.id);
      setInputValue(item.name);
    } else {
      setEditId(null);
      setInputValue('');
    }
    setIsModalOpen(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#64748B" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Institutional Registry</Text>
          <Text style={styles.headerSubtitle}>ADMINISTRATIVE TERMINAL</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'grades' && styles.activeTab]} 
          onPress={() => setActiveTab('grades')}
        >
          <Layers size={18} color={activeTab === 'grades' ? '#fff' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'grades' && styles.activeTabText]}>GRADES</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'subjects' && styles.activeTab]} 
          onPress={() => setActiveTab('subjects')}
        >
          <BookOpen size={18} color={activeTab === 'subjects' ? '#fff' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'subjects' && styles.activeTabText]}>SUBJECTS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.list}>
            {(activeTab === 'grades' ? grades : subjects).map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardInfo}>
                   <Text style={styles.cardTitle}>{item.name}</Text>
                   <Text style={styles.cardSub}>{activeTab === 'grades' ? `${item.classCount || 0} ACTIVE UNITS` : 'CURRICULUM ENTITY'}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEditor(item)} style={styles.actionBtn}>
                    <Edit3 size={18} color="#6366F1" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.actionBtn}>
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {isModalOpen && (
        <View style={styles.modalOverlay}>
           <View style={styles.modal}>
              <Text style={styles.modalTitle}>{editId ? 'ADJUST REGISTRY' : 'NEW REGISTRY ENTITY'}</Text>
              <TextInput 
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={activeTab === 'grades' ? "GRADE NAME (e.g. Grade 10)" : "SUBJECT NAME (e.g. Mathematics)"}
                autoFocus
              />
              <View style={styles.modalActions}>
                 <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalOpen(false)}>
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={processing}>
                    {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>AUTHORIZE</Text>}
                 </TouchableOpacity>
              </View>
           </View>
        </View>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => openEditor()}>
        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.fabGradient}>
          <Plus size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    letterSpacing: 1.5,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  activeTabText: {
    color: '#fff',
  },
  scrollContent: {
    padding: 24,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  cardSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    borderRadius: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  modal: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 24,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 32,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#0F172A',
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  }
});

export default RegistryManageScreen;
