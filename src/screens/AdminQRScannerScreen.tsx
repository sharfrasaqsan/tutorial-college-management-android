import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { X, QrCode, CreditCard, User, BookOpen, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

export default function AdminQRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Payment state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('Monthly Tuition Fee');
  const [selectedMonth, setSelectedMonth] = useState('April');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const navigation = useNavigation();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    
    // Set current month
    const now = new Date();
    setSelectedMonth(months[now.getMonth()]);
  }, [permission]);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    try {
      let studentId = data;
      // Handle potential URL-based QR codes
      if (data.includes('/verify/student/')) {
        const parts = data.split('/verify/student/');
        studentId = parts[1].split('?')[0];
      }

      setLoading(true);
      const studentSnap = await getDoc(doc(db, "students", studentId));

      if (studentSnap.exists()) {
        const sData = { id: studentSnap.id, ...studentSnap.data() };
        setStudent(sData);
        
        // Fetch enrolled classes details
        if (sData.enrolledClasses && sData.enrolledClasses.length > 0) {
           const classes: any[] = [];
           for (const cid of sData.enrolledClasses) {
             const cSnap = await getDoc(doc(db, "classes", cid));
             if (cSnap.exists()) {
               classes.push({ id: cSnap.id, ...cSnap.data() });
             }
           }
           setEnrolledClasses(classes);
           
           // Auto-select first class if only one
           if (classes.length === 1) {
             setSelectedClassIds([classes[0].id]);
             setPaymentAmount(String(classes[0].monthlyFee || 0));
           }
        }
        
        setStudentModalOpen(true);
      } else {
        Alert.alert("Not Found", "Student identity record not located in cloud storage.");
        setTimeout(() => setScanned(false), 2000);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Registry Error", "Handshake with cloud database failed.");
      setTimeout(() => setScanned(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  const toggleClass = (classId: string, fee: number) => {
    setSelectedClassIds(prev => {
      const isSelected = prev.includes(classId);
      const next = isSelected ? prev.filter(id => id !== classId) : [...prev, classId];
      
      // Calculate new total
      const total = enrolledClasses
        .filter(c => next.includes(c.id))
        .reduce((sum, c) => sum + (c.monthlyFee || 0), 0);
      
      setPaymentAmount(String(total));
      return next;
    });
  };

  const handlePaymentSubmit = async () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      Alert.alert("Invalid Ledger", "Please specify a valid financial amount.");
      return;
    }

    if (selectedClassIds.length === 0) {
      Alert.alert("No subject selected", "Please select at least one cohort for this transaction.");
      return;
    }
    
    setSubmittingPayment(true);
    try {
      const now = new Date();
      const selectedClasses = enrolledClasses.filter(c => selectedClassIds.includes(c.id));
      
      const paymentData = {
        studentId: student.id,
        studentName: student.name,
        classIds: selectedClassIds,
        classNames: selectedClasses.map(c => c.name),
        amount: Number(paymentAmount),
        method: "cash",
        status: "paid",
        description: paymentDesc,
        createdAt: serverTimestamp(),
        month: selectedMonth.toLowerCase(),
        processedVia: 'mobile_qr'
      };

      await addDoc(collection(db, "payments"), paymentData);
      Alert.alert("Success", "Financial transaction verified and synchronized.");
      
      setStudentModalOpen(false);
      setStudent(null);
      setEnrolledClasses([]);
      setSelectedClassIds([]);
      setPaymentAmount('');
      setTimeout(() => setScanned(false), 1000);
    } catch (err) {
      console.error(err);
      Alert.alert("Vault Error", "Failed to synchronize transaction with cloud ledger.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (!permission) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <X size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Financial Scanner</Text>
          <Text style={styles.subtitle}>SECURE TRANSACTION TERMINAL</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.cameraContainer}>
        {loading ? (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Verifying Cloud Identity...</Text>
            </View>
        ) : (
            <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                style={StyleSheet.absoluteFillObject}
            />
        )}
        <View style={styles.overlay}>
           <View style={styles.scanTarget} />
           <Text style={styles.overlayText}>Aim at Student ID QR</Text>
        </View>
        {scanned && !studentModalOpen && !loading && (
          <TouchableOpacity style={styles.scanAgainButton} onPress={() => setScanned(false)}>
            <Text style={styles.scanAgainText}>Reset Scanner</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={studentModalOpen} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {student && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Fee Collection</Text>
                    <TouchableOpacity onPress={() => { setStudentModalOpen(false); setScanned(false); }}>
                        <X size={24} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Student Info Card */}
                <View style={styles.profileSummary}>
                    <LinearGradient
                      colors={['#6366F1', '#4F46E5']}
                      style={styles.avatar}
                    >
                        <Text style={styles.avatarText}>{student.name.charAt(0)}</Text>
                    </LinearGradient>
                    <View>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <Text style={styles.studentMeta}>{student.studentId || 'STD-7762'} • {student.grade}</Text>
                    </View>
                </View>

                {/* Class Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Cohorts</Text>
                    {enrolledClasses.length > 0 ? enrolledClasses.map((cls) => (
                        <TouchableOpacity 
                            key={cls.id} 
                            onPress={() => toggleClass(cls.id, cls.monthlyFee || 0)}
                            style={[
                                styles.classItem, 
                                selectedClassIds.includes(cls.id) && styles.selectedClassItem
                            ]}
                        >
                            <View style={styles.classInfo}>
                                <BookOpen size={16} color={selectedClassIds.includes(cls.id) ? "#fff" : "#64748B"} />
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={[styles.className, selectedClassIds.includes(cls.id) && styles.selectedText]}>{cls.name}</Text>
                                    <Text style={[styles.classFee, selectedClassIds.includes(cls.id) && styles.selectedSubtext]}>Monthly: LKR {cls.monthlyFee?.toLocaleString()}</Text>
                                </View>
                            </View>
                            {selectedClassIds.includes(cls.id) && <CheckCircle2 size={20} color="#fff" />}
                        </TouchableOpacity>
                    )) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No active enrollments found for this student.</Text>
                        </View>
                    )}
                </View>

                {/* Amount Section */}
                <View style={styles.formGrid}>
                    <View style={{ marginBottom: 20 }}>
                        <Text style={styles.label}>TRANSACTION AMOUNT (LKR)</Text>
                        <View style={styles.inputWrapper}>
                           <Text style={styles.currencyPrefix}>Rs.</Text>
                           <TextInput 
                                style={styles.amountInput}
                                keyboardType="numeric"
                                value={paymentAmount}
                                onChangeText={setPaymentAmount}
                                placeholder="0.00"
                            />
                        </View>
                    </View>

                    <View style={{ marginBottom: 20 }}>
                        <Text style={styles.label}>ACADEMIC MONTH</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
                            {months.map(m => (
                                <TouchableOpacity 
                                    key={m} 
                                    style={[styles.monthBtn, selectedMonth === m && styles.selectedMonthBtn]}
                                    onPress={() => setSelectedMonth(m)}
                                >
                                    <Text style={[styles.monthText, selectedMonth === m && styles.selectedMonthText]}>{m.slice(0,3)}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <TouchableOpacity 
                        onPress={handlePaymentSubmit}
                        disabled={submittingPayment || selectedClassIds.length === 0}
                    >
                        <LinearGradient
                          colors={['#10B981', '#059669']}
                          style={[styles.submitButton, (submittingPayment || selectedClassIds.length === 0) && styles.disabledBtn]}
                        >
                            {submittingPayment ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <CreditCard size={18} color="#fff" />
                                    <Text style={styles.submitText}>Complete Settlement</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerInfo: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6366F1',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  cameraContainer: {
    flex: 1,
    margin: 24,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTarget: {
    width: 240,
    height: 240,
    borderWidth: 4,
    borderColor: '#6366F1',
    borderRadius: 40,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  overlayText: {
    color: '#fff',
    marginTop: 30,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  scanAgainButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 6,
  },
  scanAgainText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  studentName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  studentMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 16,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    marginBottom: 12,
  },
  selectedClassItem: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  className: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  classFee: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },
  selectedText: {
    color: '#fff',
  },
  selectedSubtext: {
    color: '#94A3B8',
  },
  formGrid: {
    gap: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 64,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '900',
    color: '#6366F1',
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
  },
  monthScroll: {
    marginHorizontal: -5,
  },
  monthBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 5,
  },
  selectedMonthBtn: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  monthText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  selectedMonthText: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginTop: 20,
    gap: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    borderRadius: 20,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
  }
});
