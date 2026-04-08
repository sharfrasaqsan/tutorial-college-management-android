import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert 
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { User, Mail, LogOut, Phone, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ProfileScreen = () => {
  const { teacherData, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to exit the portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
           <Text style={styles.avatarText}>{teacherData?.name?.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{teacherData?.name}</Text>
        <Text style={styles.role}>ACADEMIC FACULTY MEMBER</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>
        
        <View style={styles.detailCard}>
           <View style={styles.detailRow}>
              <View style={styles.iconBox}>
                <Mail size={16} color="#6366F1" />
              </View>
              <View style={styles.detailInfo}>
                 <Text style={styles.detailLabel}>INSTITUTIONAL EMAIL</Text>
                 <Text style={styles.detailValue}>{teacherData?.email || 'not set'}</Text>
              </View>
           </View>

           <View style={styles.divider} />

           <View style={styles.detailRow}>
              <View style={styles.iconBox}>
                <Phone size={16} color="#6366F1" />
              </View>
              <View style={styles.detailInfo}>
                 <Text style={styles.detailLabel}>PRIMARY CONTACT</Text>
                 <Text style={styles.detailValue}>{teacherData?.phone || 'not set'}</Text>
              </View>
           </View>
        </View>

        <Text style={styles.sectionLabel}>SYSTEM CONTROLS</Text>

        <TouchableOpacity style={styles.controlButton}>
           <View style={styles.controlInfo}>
              <ShieldCheck size={18} color="#64748B" />
              <Text style={styles.controlText}>Security & Privacy</Text>
           </View>
           <ChevronRight size={16} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, { borderBottomWidth: 0, marginTop: 40, borderTopWidth: 1, borderColor: '#FEE2E2' }]} 
          onPress={handleLogout}
        >
           <View style={styles.controlInfo}>
              <LogOut size={18} color="#EF4444" />
              <Text style={[styles.controlText, { color: '#EF4444' }]}>Sign Out from Portal</Text>
           </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 36,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  role: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 2,
    marginTop: 4,
  },
  content: {
    padding: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
    marginBottom: 20,
    marginTop: 10,
    marginLeft: 4,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  controlInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  }
});

export default ProfileScreen;
