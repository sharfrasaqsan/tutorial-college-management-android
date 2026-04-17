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
  collection, 
  query, 
  getDocs, 
  orderBy, 
  serverTimestamp, 
  addDoc,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ChevronLeft, 
  CreditCard, 
  Calendar as CalendarIcon, 
  DollarSign, 
  Check,
  Briefcase
} from 'lucide-react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';

const PaymentManageScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'AddPayment'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { studentId, studentName } = route.params;

  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('0');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [method, setMethod] = useState('Cash');
  const [paymentType, setPaymentType] = useState('Tuition'); // Tuition, Admission, Arrears
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const sSnap = await getDocs(query(collection(db, "classes"), where("status", "==", "active")));
        setClasses(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      }
    };
    loadClasses();
  }, []);

  const handleSave = async () => {
    if (Number(amount) <= 0) {
      Alert.alert('Validation Error', 'Payment amount must be greater than zero.');
      return;
    }

    setSaving(true);
    try {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      
      await addDoc(collection(db, 'payments'), {
        studentId,
        studentName,
        amount: Number(amount),
        month: selectedMonth,
        method,
        type: paymentType.toLowerCase(),
        classId: selectedClassId,
        className: selectedClass?.name || "",
        subject: selectedClass?.subject || "",
        status: 'paid',
        createdAt: serverTimestamp()
      });

      Alert.alert('Success', 'Fiscal receipt authorized and logged successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Process Error', 'Failed to synchronize institutional ledger.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#64748B" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Fiscal Entry</Text>
          <Text style={styles.headerSubtitle}>RECEIVE PAYMENT: {studentName.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TRANSACTION PARAMETERS</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Billing Month</Text>
            <View style={styles.monthSelector}>
               <CalendarIcon size={18} color="#6366F1" />
               <TextInput 
                 style={styles.monthInput}
                 value={selectedMonth}
                 onChangeText={setSelectedMonth}
                 placeholder="YYYY-MM"
               />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Payment Amount (LKR)</Text>
            <View style={styles.amountInputContainer}>
               <DollarSign size={20} color="#64748B" style={{ marginLeft: 16 }} />
               <TextInput 
                 style={styles.amountInput} 
                 value={amount} 
                 onChangeText={setAmount} 
                 keyboardType="numeric"
                 placeholder="0.00"
               />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Unit Assignment (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitList}>
               {classes.map(c => (
                 <TouchableOpacity 
                   key={c.id} 
                   style={[styles.unitChip, selectedClassId === c.id && styles.unitChipActive]}
                   onPress={() => setSelectedClassId(selectedClassId === c.id ? '' : c.id)}
                 >
                   <Text style={[styles.unitChipText, selectedClassId === c.id && styles.unitChipTextActive]}>{c.name}</Text>
                 </TouchableOpacity>
               ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LEDGER TAGGING</Text>
          <View style={styles.tabContainer}>
            {['Tuition', 'Admission', 'Arrears'].map(tag => (
              <TouchableOpacity 
                key={tag} 
                style={[styles.tag, paymentType === tag && styles.tagActive]}
                onPress={() => setPaymentType(tag)}
              >
                <Text style={[styles.tagText, paymentType === tag && styles.tagTextActive]}>{tag.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
          <View style={styles.methodList}>
            {['Cash', 'Bank Transfer', 'Card'].map(m => (
              <TouchableOpacity 
                key={m} 
                style={[styles.methodCard, method === m && styles.methodCardActive]}
                onPress={() => setMethod(m)}
              >
                <View style={[styles.methodRadio, method === m && styles.methodRadioActive]}>
                   {method === m && <View style={styles.methodRadioInner} />}
                </View>
                <Text style={[styles.methodLabel, method === m && styles.methodLabelActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.policyCard}>
          <Briefcase size={20} color="#6366F1" />
          <Text style={styles.policyText}>Authorized entries are immediately finalized in the institutional CRM and cannot be modified via mobile.</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave} 
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.saveButtonText}>AUTHORIZE FISCAL RECEIPT</Text>
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  monthInput: {
    flex: 1,
    padding: 16,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
  },
  amountInput: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  unitList: {
    flexDirection: 'row',
    gap: 10,
  },
  unitChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10,
  },
  unitChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  unitChipTextActive: {
    color: '#6366F1',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: 14,
    gap: 6,
  },
  tag: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tagActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
  },
  tagTextActive: {
    color: '#0F172A',
  },
  methodList: {
    gap: 10,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodCardActive: {
    borderColor: '#6366F1',
    backgroundColor: '#F5F7FF',
  },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodRadioActive: {
    borderColor: '#6366F1',
  },
  methodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  methodLabelActive: {
    color: '#0F172A',
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
    marginTop: 10,
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

export default PaymentManageScreen;
