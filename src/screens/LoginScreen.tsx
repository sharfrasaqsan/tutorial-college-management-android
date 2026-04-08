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
import { LogIn } from 'lucide-react-native';

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
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.logo}>🏫</Text>
          <Text style={styles.title}>Tutorial College</Text>
          <Text style={styles.subtitle}>Teacher Portal Mobile</Text>
        </View>

        <View style={styles.form}>
           <Text style={styles.label}>EMAIL ADDRESS</Text>
           <TextInput
             style={styles.input}
             placeholder="teacher@example.com"
             value={email}
             onChangeText={setEmail}
             autoCapitalize="none"
             keyboardType="email-address"
           />

           <Text style={styles.label}>PASSWORD</Text>
           <TextInput
             style={styles.input}
             placeholder="••••••••"
             value={password}
             onChangeText={setPassword}
             secureTextEntry
           />

           <TouchableOpacity 
             style={styles.button} 
             onPress={handleLogin}
             disabled={loading}
           >
             {loading ? <ActivityIndicator color="#fff" /> : (
               <View style={styles.buttonContent}>
                 <LogIn size={18} color="#fff" strokeWidth={3} />
                 <Text style={styles.buttonText}>SIGN IN TO PORTAL</Text>
               </View>
             )}
           </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2026 Tutorial College Management</Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  logo: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366F1',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 32,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
    color: '#1E293B',
  },
  button: {
    backgroundColor: '#4F46E5',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 10,
  },
  footer: {
    marginTop: 48,
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
  }
});

export default LoginScreen;
