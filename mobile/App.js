import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Home, MessageSquare, Calendar, Activity, Settings } from 'lucide-react-native';

import LoginScreen from './src/screens/LoginScreen';
import DoctorLoginScreen from './src/screens/DoctorLoginScreen';
import IntakeScreen from './src/screens/IntakeScreen';
import AssessmentScreen from './src/screens/AssessmentScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ChatScreen from './src/screens/ChatScreen';
import AppointmentsScreen from './src/screens/AppointmentsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DoctorDashboardScreen from './src/screens/DoctorDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function PatientTabs({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#E8E8E8' },
        headerTitleStyle: { fontWeight: 'bold', color: '#0D1B2A' },
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E0E0E0', height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: '#0E7C7B',
        tabBarInactiveTintColor: '#3D5A80'
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size || 22} />
        }}
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{
          title: 'Companion',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size || 22} />
        }}
      />
      <Tab.Screen 
        name="Appointments" 
        component={AppointmentsScreen} 
        options={{
          title: 'Booking',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size || 22} />
        }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen} 
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size || 22} />
        }}
      />
      <Tab.Screen 
        name="Settings" 
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size || 22} />
        }}
      >
        {props => <SettingsScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const userStr = await AsyncStorage.getItem('serene_user');
      const token = await AsyncStorage.getItem('serene_token');
      if (userStr && token) {
        setUser(JSON.parse(userStr));
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Auth Check Error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    setUser(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0E7C7B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Unauthenticated Auth Flow
          <>
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onLoginSuccess={handleAuthSuccess} />}
            </Stack.Screen>
            <Stack.Screen name="DoctorLogin">
              {props => <DoctorLoginScreen {...props} onLoginSuccess={handleAuthSuccess} />}
            </Stack.Screen>
          </>
        ) : user.role === 'doctor' ? (
          // Doctor Flow
          <Stack.Screen name="DoctorMain">
            {props => <DoctorDashboardScreen {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        ) : user.needsIntake ? (
          // Mandatory Intake Questionnaire
          <Stack.Screen name="Intake">
            {props => <IntakeScreen {...props} onComplete={handleAuthSuccess} />}
          </Stack.Screen>
        ) : user.needsAssessment ? (
          // Mandatory PHQ-9 & GAD-7 Assessment
          <Stack.Screen name="Assessment">
            {props => <AssessmentScreen {...props} onComplete={handleAuthSuccess} />}
          </Stack.Screen>
        ) : (
          // Main Patient App
          <Stack.Screen name="PatientMain">
            {props => <PatientTabs {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center'
  }
});
