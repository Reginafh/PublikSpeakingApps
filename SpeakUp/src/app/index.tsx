import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
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
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* LOGO & HEADER */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBox}>
                <Ionicons name="mic" size={32} color="#fff" />
              </View>
              {/* Notification Dot */}
              <View style={styles.notificationDot}>
                <View style={styles.innerDot} />
              </View>
            </View>
            <Text style={styles.title}>SpeakUp</Text>
            
            <View style={styles.subtitleContainer}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Gemini AI</Text>
              </View>
              <Text style={styles.subtitleText}>Master the Art of Speaking</Text>
            </View>
          </View>

          {/* TAB TOGGLE */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, isLogin && styles.activeTab]} 
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, !isLogin && styles.activeTab]} 
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>Create Account</Text>
            </TouchableOpacity>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="alex.morgan@example.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.passwordHeader}>
              <Text style={styles.inputLabel}>Password</Text>
              {isLogin && (
                <TouchableOpacity>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* INFO BOX */}
            <View style={styles.infoBox}>
              <Ionicons name="analytics-outline" size={20} color="#432CBA" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Real-time filler-word tracking, pacing metrics, and vocal tone AI diagnostics ready upon login.
              </Text>
            </View>

            {/* PRIMARY BUTTON */}
            <TouchableOpacity style={styles.primaryButton} onPress={handleAuth}>
              <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
            </TouchableOpacity>

            {/* DIVIDER */}
            <View style={styles.dividerContainer}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.line} />
            </View>

            {/* GOOGLE BUTTON */}
            <TouchableOpacity style={styles.googleButton} onPress={() => Alert.alert('Google Auth')}>
              <Ionicons name="logo-google" size={20} color="#DB4437" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <Text style={styles.footerText}>
            By continuing, you agree to SpeakUp's <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy Policy</Text>.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY_COLOR = '#3924B7'; // Deep purple from the design

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FC' }, // Very slight blue/purple tint background
  scrollContainer: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  
  header: { alignItems: 'center', marginBottom: 24 },
  logoContainer: { position: 'relative', marginBottom: 16 },
  logoBox: { backgroundColor: PRIMARY_COLOR, width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#64D2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#F8F9FC' },
  innerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#004A66' },
  title: { fontSize: 32, fontWeight: '800', color: PRIMARY_COLOR, marginBottom: 8 },
  subtitleContainer: { flexDirection: 'row', alignItems: 'center' },
  badge: { backgroundColor: '#EBE9FE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  badgeText: { color: PRIMARY_COLOR, fontSize: 12, fontWeight: '700' },
  subtitleText: { fontSize: 14, color: '#555', fontWeight: '500' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#EBE9FE', borderRadius: 12, padding: 4, marginBottom: 24 },
  tabButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 15, fontWeight: '600', color: '#666' },
  activeTabText: { color: PRIMARY_COLOR },

  form: { width: '100%' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 16 },
  forgotPasswordText: { fontSize: 14, fontWeight: '600', color: PRIMARY_COLOR },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E2E8', paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#333' },

  infoBox: { flexDirection: 'row', backgroundColor: '#F3F0FF', padding: 16, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  infoIcon: { marginRight: 12 },
  infoText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },

  primaryButton: { backgroundColor: PRIMARY_COLOR, padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', marginRight: 8 },
  buttonIcon: { marginTop: 2 },

  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  line: { flex: 1, height: 1, backgroundColor: '#E2E2E8' },
  dividerText: { marginHorizontal: 16, color: '#888', fontSize: 12, fontWeight: '600' },

  googleButton: { backgroundColor: '#fff', height: 56, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E2E8', marginBottom: 32 },
  googleIcon: { marginRight: 12 },
  googleButtonText: { color: '#333', fontSize: 16, fontWeight: '700' },

  footerText: { textAlign: 'center', fontSize: 13, color: '#888', lineHeight: 20, paddingHorizontal: 16 },
  linkText: { color: '#555', fontWeight: '600', textDecorationLine: 'underline' },
});