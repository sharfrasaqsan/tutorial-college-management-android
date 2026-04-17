import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#6366F1', '#4F46E5']}
                style={styles.logoGradient}
              >
                <Shield size={40} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>SMART ACADEMY</Text>
            <Text style={styles.subtitle}>INSTITUTIONAL ACCESS</Text>
          </View>

          <View style={styles.form}>
             <Text style={styles.label}>INSTITUTIONAL EMAIL</Text>
             <TextInput
               style={styles.input}
               placeholder="faculty@smartacademy.edu"
               placeholderTextColor="#94A3B8"
               value={email}
               onChangeText={setEmail}
               autoCapitalize="none"
               keyboardType="email-address"
             />

             <Text style={styles.label}>SECURITY KEY</Text>
             <TextInput
               style={styles.input}
               placeholder="••••••••"
               placeholderTextColor="#94A3B8"
               value={password}
             onChangeText={setPassword}
             secureTextEntry
           />

             <TouchableOpacity 
               onPress={handleLogin}
               disabled={loading}
             >
               <LinearGradient
                   colors={['#4F46E5', '#3730A3']}
                   style={styles.button}
               >
                 {loading ? <ActivityIndicator color="#fff" /> : (
                   <View style={styles.buttonContent}>
                     <LogIn size={18} color="#fff" strokeWidth={3} />
                     <Text style={styles.buttonText}>AUTHENTICATE</Text>
                   </View>
                 )}
               </LinearGradient>
             </TouchableOpacity>
          </View>

          <Text style={styles.footer}>SMART ACADEMY CLOUD ARCHITECTURE © 2026</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  inner: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#6366F1',
    marginTop: 8,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2,
    marginBottom: 10,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 18,
    borderRadius: 16,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 24,
    color: '#F8FAFC',
  },
  button: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 2,
  }
});

export default LoginScreen;
