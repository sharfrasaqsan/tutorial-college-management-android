import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MarkAttendanceScreen from './src/screens/MarkAttendanceScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TimetableScreen from './src/screens/TimetableScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import StudentsScreen from './src/screens/StudentsScreen';
import ClassManageScreen from './src/screens/ClassManageScreen';
import { RootStackParamList, MainTabParamList } from './src/navigation/types';
import { StatusBar } from 'expo-status-bar';
import { LayoutDashboard, ClipboardList, User, Calendar } from 'lucide-react-native';
import { View, Text, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TabNavigator = () => {
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
          tabBarLabel: 'PORTAL'
        }}
      />
      <Tab.Screen 
        name="Timetable" 
        component={TimetableScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          tabBarLabel: 'TABLE'
        }}
      />
      <Tab.Screen 
        name="AttendanceHistory" 
        component={AttendanceHistoryScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <ClipboardList size={size} color={color} />,
          tabBarLabel: 'LEDGER'
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          tabBarLabel: 'STAFF'
        }}
      />
    </Tab.Navigator>
  );
};

const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

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
