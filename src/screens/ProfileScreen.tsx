import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { 
  User, Mail, LogOut, Phone, Shield, ChevronRight, Fingerprint, 
  TrendingUp, Users, Database, Settings, Activity, FileText 
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';

const ProfileScreen = () => {
  const { teacherData, isAdmin, signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ studentCount: 0 });

  useEffect(() => {
    if (isAdmin) {
      const fetchAdminStats = async () => {
        try {
          const snapshot = await getCountFromServer(collection(db, "students"));
          setStats({ studentCount: snapshot.data().count });
        } catch (e) {
          console.error(e);
        }
      };
      fetchAdminStats();
    }
  }, [isAdmin]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to terminate the secure session and exit the portal?',
      [
        { text: 'Stay Connected', style: 'cancel' },
        { text: 'Terminate Session', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const AdminProfile = () => (
    <View style={styles.adminContainer}>
      <View style={styles.authorityHeader}>
        <View style={styles.avatarWrapper}>
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={styles.adminAvatar}
          >
            <Text style={styles.adminAvatarText}>{user?.email?.charAt(0).toUpperCase() || 'A'}</Text>
          </LinearGradient>
          <View style={styles.directorBadge}>
             <Shield size={10} color="#fff" />
          </View>
        </View>
        <Text style={styles.adminName}>{user?.email?.split('@')[0].toUpperCase()}</Text>
        <View style={styles.roleTag}>
           <Text style={styles.roleTagText}>SYSTEM AUTHORITY DIRECTOR</Text>
        </View>
      </View>

      <View style={styles.telemetryGrid}>
         <View style={styles.telemetryCard}>
            <View style={[styles.telIcon, { backgroundColor: '#F0F9FF' }]}>
               <Users size={16} color="#0EA5E9" />
            </View>
            <View>
               <Text style={styles.telValue}>{stats.studentCount}</Text>
               <Text style={styles.telLabel}>REGISTRY SIZE</Text>
            </View>
         </View>
         <View style={styles.telemetryCard}>
            <View style={[styles.telIcon, { backgroundColor: '#F0FDF4' }]}>
               <Activity size={16} color="#10B981" />
            </View>
            <View>
               <Text style={styles.telValue}>OPTIMAL</Text>
               <Text style={styles.telLabel}>SYSTEM HEALTH</Text>
            </View>
         </View>
      </View>

      <Text style={styles.sectionLabel}>INSTITUTIONAL COMMANDS</Text>
      
      <View style={styles.commandsList}>
         {[
           { icon: Database, label: 'Financial Audit Ledger', color: '#6366F1' },
           { icon: FileText, label: 'System Access Logs', color: '#475569' },
           { icon: Settings, label: 'Global Configurations', color: '#94A3B8' },
         ].map((item, idx) => (
           <TouchableOpacity key={idx} style={styles.commandItem}>
             <View style={styles.commandLeft}>
               <item.icon size={18} color={item.color} />
               <Text style={styles.commandText}>{item.label}</Text>
             </View>
             <ChevronRight size={14} color="#CBD5E1" />
           </TouchableOpacity>
         ))}
      </View>
    </View>
  );

  const TeacherProfile = () => (
    <View style={styles.teacherContainer}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>{teacherData?.name?.charAt(0)}</Text>
          </LinearGradient>
        </View>
        <Text style={styles.name}>{teacherData?.name}</Text>
        <Text style={styles.role}>ACADEMIC FACULTY MEMBER</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>IDENTITY & CONTACT</Text>
        
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
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {isAdmin ? <AdminProfile /> : <TeacherProfile />}

        <View style={styles.footerActions}>
          <Text style={styles.sectionLabel}>SECURITY & SESSIONS</Text>
          
          <TouchableOpacity style={styles.controlButton}>
             <View style={styles.controlInfo}>
                <Fingerprint size={18} color="#64748B" />
                <Text style={styles.controlText}>Biometric Encryption</Text>
             </View>
             <ChevronRight size={16} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.controlButton, styles.logoutButton]} 
            onPress={handleLogout}
          >
             <View style={styles.controlInfo}>
                <LogOut size={18} color="#EF4444" />
                <Text style={[styles.controlText, { color: '#EF4444' }]}>Sign Out from Terminal</Text>
             </View>
          </TouchableOpacity>
          
          <Text style={styles.versionText}>VER: 2.1.0-AUTHORITY</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  adminContainer: {
    paddingBottom: 20,
  },
  authorityHeader: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  adminAvatar: {
    width: 110,
    height: 110,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  adminAvatarText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
  },
  directorBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 1,
  },
  roleTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1,
  },
  telemetryGrid: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  telemetryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  telIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  telValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  telLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginTop: 10,
    paddingHorizontal: 24,
  },
  commandsList: {
    paddingHorizontal: 24,
    gap: 10,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  commandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  commandText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  teacherContainer: {
    paddingBottom: 0,
  },
  header: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatarContainer: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 20,
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 42,
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
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
  footerActions: {
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  logoutButton: {
    marginTop: 30,
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  controlInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '900',
    color: '#CBD5E1',
    marginTop: 40,
    letterSpacing: 2,
  }
});

export default ProfileScreen;
