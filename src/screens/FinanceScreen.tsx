import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { collection, query, getDocs, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ChevronLeft, 
  ArrowUpRight, 
  ArrowDownRight,
  Search,
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  ArrowRight
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

const FinanceScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    income: 0,
    expense: 0,
    profit: 0,
    arrears: 0
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedMonth = format(selectedDate, "yyyy-MM");

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const qPay = query(collection(db, "payments"), where("month", "==", selectedMonth));
      const qSal = query(collection(db, "salaries"), where("month", "==", selectedMonth));
      
      const [paymentsSnap, salariesSnap] = await Promise.all([
        getDocs(qPay),
        getDocs(qSal)
      ]);

      const payData = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
      const salData = salariesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setPayments(payData);
      setSalaries(salData);

      // Totals
      const monthIncome = payData.filter((p: any) => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
      const monthExpense = salData.filter((s: any) => s.status === 'paid').reduce((sum, s) => sum + (s.netAmount || 0), 0);
      const monthArrears = payData.filter((p: any) => p.status !== 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);

      setSummary({
        income: monthIncome,
        expense: monthExpense,
        profit: monthIncome - monthExpense,
        arrears: monthArrears
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [selectedMonth]);

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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Financial Terminal</Text>
          <View style={styles.monthSelector}>
             <TouchableOpacity onPress={() => setSelectedDate(prev => new Date(prev.setMonth(prev.getMonth() - 1)))}>
                <ChevronLeft size={16} color="#6366F1" />
             </TouchableOpacity>
             <Text style={styles.selectedMonthText}>{format(selectedDate, "MMMM yyyy")}</Text>
             <TouchableOpacity onPress={() => setSelectedDate(prev => new Date(prev.setMonth(prev.getMonth() + 1)))}>
                <ChevronLeft size={16} color="#6366F1" style={{ transform: [{ rotate: '180deg'}] }} />
             </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Capital Card */}
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          style={styles.capitalCard}
        >
          <View style={styles.capitalHeader}>
            <View>
              <Text style={styles.capitalLabel}>INSTITUTIONAL LIQUIDITY</Text>
              <Text style={styles.capitalValue}>LKR {summary.profit.toLocaleString()}</Text>
            </View>
            <View style={styles.walletIcon}>
              <Wallet size={24} color="#6366F1" />
            </View>
          </View>
          
          <View style={styles.capitalDivider} />
          
          <View style={styles.capitalFooter}>
            <View style={styles.statMini}>
              <ArrowUpRight size={14} color="#10B981" />
              <Text style={styles.statMiniValue}>LKR {summary.income.toLocaleString()}</Text>
              <Text style={styles.statMiniLabel}>REVENUE</Text>
            </View>
            <View style={styles.statMini}>
              <ArrowDownRight size={14} color="#EF4444" />
              <Text style={styles.statMiniValue}>LKR {summary.expense.toLocaleString()}</Text>
              <Text style={styles.statMiniLabel}>PAYROLL</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Arrears Risk */}
        <View style={styles.riskCard}>
           <View style={styles.riskInfo}>
              <AlertCircle size={20} color="#F59E0B" />
              <View style={{ marginLeft: 12 }}>
                 <Text style={styles.riskLabel}>OUTSTANDING ARREARS</Text>
                 <Text style={styles.riskValue}>LKR {summary.arrears.toLocaleString()}</Text>
              </View>
           </View>
           <TouchableOpacity style={styles.riskAction}>
              <ArrowRight size={16} color="#F59E0B" />
           </TouchableOpacity>
        </View>

        {/* Transactions List */}
         <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>REVENUE HISTORY</Text>
           <TouchableOpacity>
             <Text style={styles.seeAll}>SEE ALL</Text>
           </TouchableOpacity>
        </View>

        {payments.map((pay) => (
          <View key={pay.id} style={styles.transactionCard}>
             <View style={styles.transLeft}>
                <View style={[styles.transIcon, { backgroundColor: '#F0FDF4' }]}>
                   <TrendingUp size={16} color="#10B981" />
                </View>
                <View>
                   <Text style={styles.transTitle}>{pay.studentName}</Text>
                   <Text style={styles.transSub}>{pay.className} • {pay.method}</Text>
                </View>
             </View>
             <View style={styles.transRight}>
                <Text style={styles.transAmount}>+ {pay.amount.toLocaleString()}</Text>
                <Text style={styles.transDate}>{pay.month}</Text>
             </View>
          </View>
        ))}

         <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={styles.sectionTitle}>PAYROLL DISBURSEMENTS</Text>
         </View>

        {salaries.map((sal) => (
          <View key={sal.id} style={styles.transactionCard}>
             <View style={styles.transLeft}>
                <View style={[styles.transIcon, { backgroundColor: '#FEF2F2' }]}>
                   <TrendingDown size={16} color="#EF4444" />
                </View>
                <View>
                   <Text style={styles.transTitle}>{sal.teacherName}</Text>
                   <Text style={styles.transSub}>{sal.className || 'Faculty Settlement'}</Text>
                </View>
             </View>
             <View style={styles.transRight}>
                <Text style={[styles.transAmount, { color: '#EF4444' }]}>- {sal.netAmount.toLocaleString()}</Text>
                <Text style={styles.transDate}>{sal.status.toUpperCase()}</Text>
             </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
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
  scrollContent: {
    padding: 24,
  },
  capitalCard: {
    padding: 24,
    borderRadius: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  capitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  capitalLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
  capitalValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capitalDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  capitalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statMini: {
    flex: 1,
  },
  statMiniValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  statMiniLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  riskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 32,
  },
  riskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 1.5,
  },
  riskValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#92400E',
    marginTop: 2,
  },
  riskAction: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
  },
  seeAll: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6366F1',
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  transLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  transSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  transRight: {
    alignItems: 'flex-end',
  },
  transAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#10B981',
  },
  selectedMonthText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
});

export default FinanceScreen;
