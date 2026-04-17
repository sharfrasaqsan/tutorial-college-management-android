import 'react-native-gesture-handler';
// INSTITUTIONAL SYNC POINT: 2026-04-17-07-22
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MarkAttendanceScreen from './src/screens/MarkAttendanceScreen';
import SalaryScreen from './src/screens/SalaryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TimetableScreen from './src/screens/TimetableScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import StudentsScreen from './src/screens/StudentsScreen';
import ClassManageScreen from './src/screens/ClassManageScreen';
import AdminQRScannerScreen from './src/screens/AdminQRScannerScreen';
import StudentManageScreen from './src/screens/StudentManageScreen';
import TeacherManageScreen from './src/screens/TeacherManageScreen';
import PaymentManageScreen from './src/screens/PaymentManageScreen';
import FinanceScreen from './src/screens/FinanceScreen';
import TeachersScreen from './src/screens/TeachersScreen';
import StudentProfileScreen from './src/screens/StudentProfileScreen';
import ClassSessionsScreen from './src/screens/ClassSessionsScreen';
import RegistryManageScreen from './src/screens/RegistryManageScreen';
import { RootStackParamList, MainTabParamList } from './src/navigation/types';
import { StatusBar } from 'expo-status-bar';
import { LayoutDashboard, ClipboardList, User, Calendar as CalendarIcon, CreditCard, Shield } from 'lucide-react-native';
import { View, Text, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TabNavigator = () => {
  const { isAdmin } = useAuth();

  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          elevation: 0,
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 1,
          marginTop: 4,
        }
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
          tabBarLabel: 'DASHBOARD'
        }}
      />
      <Tab.Screen 
        name="Timetable" 
        component={TimetableScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <CalendarIcon size={size} color={color} />,
          tabBarLabel: 'SCHEDULE'
        }}
      />
      {!isAdmin && (
        <Tab.Screen 
          name="Salary" 
          component={SalaryScreen} 
          options={{
            tabBarIcon: ({ color, size }) => <CreditCard size={size} color={color} />,
            tabBarLabel: 'PAY'
          }}
        />
      )}
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          tabBarLabel: 'PROFILE'
        }}
      />
    </Tab.Navigator>
  );
};

const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Shield size={48} color="#6366F1" />
        <Text style={{ marginTop: 20, fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 2 }}>
          STARTING APP...
        </Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="Students" component={StudentsScreen} />
          <Stack.Screen name="ManageClass" component={ClassManageScreen} />
          <Stack.Screen name="AdminQRScanner" component={AdminQRScannerScreen} />
          <Stack.Screen name="StudentProfile" component={StudentProfileScreen} />
          <Stack.Screen name="Finance" component={FinanceScreen} />
          <Stack.Screen name="Teachers" component={TeachersScreen} />
          <Stack.Screen name="ManageStudent" component={StudentManageScreen} />
          <Stack.Screen name="ManageTeacher" component={TeacherManageScreen} />
          <Stack.Screen name="AddPayment" component={PaymentManageScreen} />
          <Stack.Screen name="Salary" component={SalaryScreen} />
          <Stack.Screen name="ClassSessions" component={ClassSessionsScreen} />
          <Stack.Screen name="RegistryManage" component={RegistryManageScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
