import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
  Linking
} from 'react-native';
import { 
  ChevronLeft, 
  User, 
  Phone, 
  MapPin, 
  Calendar as CalendarIcon, 
  GraduationCap, 
  CreditCard,
  Trash2,
  Download,
  Shield,
  Hash,
  ArrowRight,
  BookOpen,
  QrCode,
  MessageCircle
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useRoute, useNavigation } from '@react-navigation/native';
import { generateStudentPaymentHistoryPDF } from '../lib/pdf-generator';

const { width } = Dimensions.get('window');

const StudentProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { studentId } = route.params;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'payments'>('info');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Student
      const sDoc = await getDoc(doc(db, "students", studentId));
      if (sDoc.exists()) {
        setStudent({ id: sDoc.id, ...sDoc.data() });
      }

      // 2. Fetch Payments
      const pQ = query(
        collection(db, "payments"),
        where("studentId", "==", studentId),
        orderBy("createdAt", "desc")
      );
      const pSnap = await getDocs(pQ);
      setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Profile Load Error:", error);
      Alert.alert("Error", "Failed to sync student record from cloud.");
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = new Date().toISOString().slice(0, 7); // yyyy-MM
  const arrearStatus = useMemo(() => {
    // Check if there are any unpaid payments or if the current month is missing
    const hasCurrentPaid = payments.some(p => p.month === currentMonth && p.status === 'paid');
    const hasArrears = payments.some(p => p.status !== 'paid');
    return (!hasCurrentPaid || hasArrears) ? 'ARREARS' : 'ACTIVE';
  }, [payments, currentMonth]);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const handleDeletePayment = (payId: string) => {
    Alert.alert(
      "Confirm Deletion",
      "Are you sure you want to purge this transaction from the cloud archive? This cannot be reversed.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            setDeleting(payId);
            try {
              await deleteDoc(doc(db, "payments", payId));
              setPayments(prev => prev.filter(p => p.id !== payId));
              Alert.alert("Success", "Transaction record deleted.");
            } catch (e) {
              Alert.alert("Error", "Failed to delete record.");
            } finally {
              setDeleting(null);
            }
          }
        }
      ]
    );
  };

  const handleShareReceipt = async (payment: any) => {
    try {
      const date = payment.createdAt instanceof Timestamp ? payment.createdAt.toDate().toLocaleDateString() : 'N/A';
      const message = `Smart Academy Receipt\nStudent: ${student.name}\nID: ${student.studentId}\nClass: ${payment.className || payment.subject}\nMonth: ${payment.month}\nAmount: LKR ${payment.amount}\nDate: ${date}`;
      
      await Share.share({
        message,
        title: 'Payment Receipt'
      });
    } catch (error) {
      Alert.alert("Spread Error", "Failed to initiate share.");
    }
  };

  const handleDownloadHistory = async () => {
    if (!student || payments.length === 0) return;
    try {
      await generateStudentPaymentHistoryPDF(payments, student);
    } catch (error) {
      Alert.alert("Error", "Failed to generate payment history statement.");
    }
  };

  const handleWhatsApp = () => {
    const phone = student?.parentPhone || student?.phone;
    if (!phone) {
        Alert.alert("No Contact", "Institutional registry missing contact number.");
        return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `whatsapp://send?phone=${cleanPhone.startsWith('94') ? cleanPhone : '94' + (cleanPhone.startsWith('0') ? cleanPhone.slice(1) : cleanPhone)}`;
    
    Linking.canOpenURL(url).then(supported => {
        if (supported) {
            Linking.openURL(url);
        } else {
            Alert.alert("Engine Failure", "WhatsApp communication terminal not found on this device.");
        }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Syncing Digital Identity...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#64748B" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Registry Profile</Text>
          <Text style={styles.headerSubtitle}>ADMINISTRATIVE RECORD</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileHeader}>
          <LinearGradient
            colors={['#EEF2FF', '#E0E7FF']}
            style={styles.avatarContainer}
          >
             <Text style={styles.avatarText}>{student?.name.charAt(0)}</Text>
             <View style={styles.statusBadge} />
          </LinearGradient>
           <Text style={styles.studentName}>{student?.name}</Text>
          <View style={styles.idRow}>
             <Hash size={12} color="#94A3B8" />
             <Text style={styles.idText}>{student?.studentId || 'PENDING'}</Text>
             {arrearStatus === 'ARREARS' ? (
                 <Text style={[styles.statusText, { color: '#EF4444' }]}>• OUTSTANDING</Text>
             ) : (
                 <Text style={styles.statusText}>• VERIFIED</Text>
             )}
          </View>

          <TouchableOpacity style={styles.waAction} onPress={handleWhatsApp}>
             <LinearGradient colors={['#10B981', '#059669']} style={styles.waGradient}>
                <MessageCircle size={16} color="#fff" />
                <Text style={styles.waText}>MESSAGE PARENT</Text>
             </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tab Selection */}
        <View style={styles.tabsContainer}>
           <TouchableOpacity 
             style={[styles.tab, activeTab === 'info' && styles.activeTab]} 
             onPress={() => setActiveTab('info')}
           >
             <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>Status</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             style={[styles.tab, activeTab === 'payments' && styles.activeTab]} 
             onPress={() => setActiveTab('payments')}
           >
             <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>Ledger</Text>
           </TouchableOpacity>
        </View>

        {activeTab === 'info' ? (
          <View style={styles.contentSection}>
            <View style={styles.statsGrid}>
               <View style={styles.statBox}>
                  <GraduationCap size={20} color="#6366F1" />
                  <Text style={styles.statLabel}>GRADE</Text>
                  <Text style={styles.statValue}>{student?.grade}</Text>
               </View>
               <View style={styles.statBox}>
                  <BookOpen size={20} color="#10B981" />
                  <Text style={styles.statLabel}>COURSES</Text>
                  <Text style={styles.statValue}>{student?.enrolledClasses?.length || 0}</Text>
               </View>
            </View>

            <View style={styles.idDisplaySection}>
               <Text style={styles.infoTitle}>Cloud Identity Protocol (QR)</Text>
               <View style={styles.qrWrapper}>
                  <View style={styles.qrContainer}>
                     <View style={styles.qrBorder}>
                        <View style={styles.qrPlaceholder}>
                           <Text style={styles.qrText}>QR</Text>
                           <View style={{ position: 'absolute' }}>
                              <ActivityIndicator size="small" color="#6366F1" style={{ opacity: 0.2 }} />
                           </View>
                           {/* Using a stable QR API for mobile display parity */}
                           <View style={{ width: 120, height: 120, backgroundColor: 'white', position: 'absolute' }}>
                              <View style={{ width: '100%', height: '100%', borderWidth: 2, borderColor: '#F1F5F9', borderRadius: 8, overflow: 'hidden' }}>
                                 <View style={styles.qrRealStub}>
                                    <QrCode size={40} color="#6366F1" style={{ opacity: 0.4 }} />
                                    <Text style={{ fontSize: 8, fontWeight: '900', color: '#94A3B8', marginTop: 8 }}>SCAN TO VERIFY</Text>
                                 </View>
                              </View>
                           </View>
                        </View>
                     </View>
                  </View>
                  <TouchableOpacity 
                    onPress={() => Alert.alert("ID Service", "ID card generation is being synchronized with the cloud. Available shortly.")}
                  >
                     <LinearGradient
                        colors={['#1E293B', '#0F172A']}
                        style={styles.downloadIdBtn}
                     >
                        <Download size={16} color="#fff" />
                        <Text style={styles.downloadIdText}>GENERATE ID</Text>
                     </LinearGradient>
                  </TouchableOpacity>
               </View>
            </View>

            <View style={styles.infoCard}>
               <Text style={styles.infoTitle}>Institutional Registry</Text>
               
               <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                     <Phone size={16} color="#94A3B8" />
                  </View>
                  <View>
                     <Text style={styles.infoLabel}>Primary Contact</Text>
                     <Text style={styles.infoValue}>{student?.parentPhone || student?.phone}</Text>
                  </View>
               </View>

               <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                     <User size={16} color="#94A3B8" />
                  </View>
                  <View>
                     <Text style={styles.infoLabel}>Guardian Identity</Text>
                     <Text style={styles.infoValue}>{student?.parentName || 'Verified Parent'}</Text>
                  </View>
               </View>

               <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                     <MapPin size={16} color="#94A3B8" />
                  </View>
                  <View>
                     <Text style={styles.infoLabel}>Home Registry</Text>
                     <Text style={styles.infoValue}>{student?.address || 'Institutional Boarding'}</Text>
                  </View>
               </View>

               <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                     <Shield size={16} color="#94A3B8" />
                  </View>
                  <View>
                     <Text style={styles.infoLabel}>Day School</Text>
                     <Text style={styles.infoValue}>{student?.schoolName || 'N/A'}</Text>
                  </View>
               </View>
            </View>
          </View>
        ) : (
          <View style={styles.contentSection}>
            <View style={styles.paymentHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={styles.paymentTitle}>Financial History</Text>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('AddPayment', { studentId, studentName: student.name })}
                    style={{ backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#fff' }}>RECEIVE PAYMENT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleDownloadHistory}
                    style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#E0E7FF' }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: '900', color: '#6366F1' }}>HISTORY</Text>
                  </TouchableOpacity>
                </View>
               <TouchableOpacity onPress={fetchStudentData}>
                 <ActivityIndicator size="small" color="#6366F1" animating={loading} />
               </TouchableOpacity>
            </View>

            {payments.length === 0 ? (
              <View style={styles.emptyContainer}>
                 <CreditCard size={48} color="#E2E8F0" />
                 <Text style={styles.emptyText}>No financial footprints detected.</Text>
              </View>
            ) : (
              payments.map((pay) => (
                <View key={pay.id} style={[styles.paymentCard, pay.status !== 'paid' && styles.paymentCardArrear]}>
                   <View style={styles.payLeft}>
                      <View style={[styles.payIcon, pay.status !== 'paid' && { backgroundColor: '#FEF2F2' }]}>
                         <CalendarIcon size={14} color={pay.status === 'paid' ? "#6366F1" : "#EF4444"} />
                      </View>
                      <View>
                         <Text style={[styles.payMonth, pay.status !== 'paid' && { color: '#EF4444' }]}>
                            {pay.month.toUpperCase()} {pay.status !== 'paid' ? '• UNPAID' : ''}
                         </Text>
                         <Text style={styles.payTotal}>LKR {pay.amount.toLocaleString()}</Text>
                         <Text style={styles.payTarget}>{pay.className || pay.subject}</Text>
                      </View>
                   </View>
                   
                   <View style={styles.payActions}>
                      <TouchableOpacity 
                        style={styles.payBtn} 
                        onPress={() => handleShareReceipt(pay)}
                      >
                         <Download size={18} color="#64748B" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.payBtn, styles.deleteBtn]} 
                        onPress={() => handleDeletePayment(pay.id)}
                        disabled={deleting === pay.id}
                      >
                        {deleting === pay.id ? (
                           <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                           <Trash2 size={18} color="#EF4444" />
                        )}
                      </TouchableOpacity>
                   </View>
                </View>
              ))
            )}
            <View style={{ height: 100 }} />
          </View>
        )}
      </ScrollView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  header: {
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
    color: '#64748B',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#6366F1',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    borderWidth: 4,
    borderColor: '#fff',
  },
  studentName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#10B981',
    marginLeft: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 30,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activeTab: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
  },
  activeTabText: {
    color: '#fff',
  },
  contentSection: {
    paddingHorizontal: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 30,
  },
  statBox: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  infoTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    maxWidth: width - 120,
  },
  idDisplaySection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  qrWrapper: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 24,
    alignItems: 'center',
  },
  qrContainer: {
    marginBottom: 20,
  },
  qrBorder: {
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#E2E8F0',
    letterSpacing: 4,
  },
  qrRealStub: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
  },
  downloadIdText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingRight: 10,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  paymentCardArrear: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FFFBFA',
  },
  payLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  payIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  payMonth: {
    fontSize: 11,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 1,
    marginBottom: 2,
  },
  payTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  payTarget: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },
  payActions: {
    flexDirection: 'row',
    gap: 8,
  },
  payBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#CBD5E1',
    marginTop: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  waAction: {
    marginTop: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 4,
  },
  waGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  waText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
  }
});

export default StudentProfileScreen;
