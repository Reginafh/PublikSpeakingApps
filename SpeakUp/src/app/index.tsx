import React, { useState } from 'react';
import { useRouter, Link } from 'expo-router';

import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  Alert, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Toggles between Login and Sign Up
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (emailText: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailText);
  };

  const handleAuth = () => {
    // console.log("1. Button was pressed!");
    // console.log("2. Email is:", email);
    // console.log("3. Password is:", password);

    // 1. Empty Field Validations
    if (!email && !password) {
      return Alert.alert('Error', 'Please fill in all fields.');
    }
    if (!email) {
      return Alert.alert('Error', 'Please enter your email address.');
    }
    if (!password) {
      return Alert.alert('Error', 'Please enter your password.');
    }

    // 2. Format Validations
    if (!isValidEmail(email)) {
      return Alert.alert('Error', 'Please enter a valid email address (e.g., name@domain.com).');
    }
    if (password.length < 6) {
      return Alert.alert('Error', 'Password must be at least 6 characters long.');
    }

    // =====================================================================
    // 3. MOCK BACKEND VALIDATION (Replace this with Firebase later)
    // =====================================================================
    const MOCK_REGISTERED_EMAIL = 'test@gmail.com';
    const MOCK_CORRECT_PASSWORD = 'password123';

    if (isLogin) {
      // If logging in, check if password matches the registered email
      if (email === MOCK_REGISTERED_EMAIL && password !== MOCK_CORRECT_PASSWORD) {
        return Alert.alert('Error', 'Incorrect password or email. Please try again.');
      } 
      else if (email !== MOCK_REGISTERED_EMAIL && password === MOCK_CORRECT_PASSWORD) {
        return Alert.alert('Error', 'Incorrect password or email. Please try again.');
      }
      else if (email !== MOCK_REGISTERED_EMAIL && password !== MOCK_CORRECT_PASSWORD) {
        return Alert.alert('Error', 'Incorrect password or email. Please try again.');
      }
    } 
    else {
      // If signing up, check if email is already taken
      if (email === MOCK_REGISTERED_EMAIL) {
        return Alert.alert('Error', 'This email is already registered. Please log in instead.');
      }
    }
    // =====================================================================

    // console.log("4. Validation passed! Pushing to OTP...");

    // TODO: Connect to your backend/Firebase here
    router.push('/otp');
  };

  const handleGoogleAuth = () => {
    // TODO: Implement Google Sign-In using @react-native-google-signin/google-signin
    Alert.alert('Google Auth', 'Redirecting to Google Sign-In...');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>SpeakUp</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Welcome back! Ready to practice?' : 'Create an account to start improving.'}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword} // Toggles masking based on state
            />
            <TouchableOpacity 
              style={styles.visibilityToggle} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.visibilityText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={handleAuth}>
            <Text style={styles.buttonText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchButton} onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleAuth}>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  visibilityToggle: {
    padding: 16,
  },
  visibilityText: {
    color: '#007AFF',
    fontWeight: '600',
  },

  primaryButton: {
    backgroundColor: '#007AFF', // You can change this to match your app's theme
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#007AFF',
    fontSize: 14,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#888',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});