import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  SafeAreaView 
} from 'react-native';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Users, 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  Mail, 
  Phone, 
  Plus 
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TeachersScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "teachers"), orderBy("name", "asc"));
      const snap = await getDocs(q);
      setTeachers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const filteredTeachers = teachers.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderTeacher = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('ManageTeacher', { teacherId: item.id })}
    >
      <View style={styles.cardHeader}>
        <LinearGradient
          colors={item.status === 'active' ? ['#6366F1', '#4F46E5'] : ['#94A3B8', '#64748B']}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarText}>{item.name?.charAt(0)}</Text>
        </LinearGradient>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.roleBadge}>
             <Text style={styles.roleText}>TEACHER</Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#10B981' : '#CBD5E1' }]} />
      </View>

      <View style={styles.divider} />

      <View style={styles.details}>
        <View style={styles.detailItem}>
           <Mail size={12} color="#94A3B8" />
           <Text style={styles.detailText}>{item.email}</Text>
        </View>
        <View style={styles.detailItem}>
           <Phone size={12} color="#94A3B8" />
           <Text style={styles.detailText}>{item.phone || 'N/A'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
           <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
             <ChevronLeft size={24} color="#64748B" />
           </TouchableOpacity>
           <View>
             <Text style={styles.headerTitle}>Teachers</Text>
             <Text style={styles.headerSubtitle}>LIST</Text>
           </View>
        </View>
        
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search teachers..."
            placeholderTextColor="#94A3B8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <FlatList
          data={filteredTeachers}
          renderItem={renderTeacher}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Users size={48} color="#E2E8F0" />
              <Text style={styles.emptyText}>No teachers found.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('ManageTeacher', {})}
      >
         <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.fabGradient}>
            <Plus size={24} color="#fff" />
         </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  info: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
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
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  empty: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default TeachersScreen;
