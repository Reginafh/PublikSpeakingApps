import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/designSystem';
import { SpeechStorage } from '../services/speechStorage';

export default function LoginScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (emailText: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailText.trim());
  };

  const handleAuth = async () => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    // 1. Validation
    if (!cleanEmail || !cleanPassword) {
      return Alert.alert('Missing Fields', 'Please enter your email and password.');
    }
    if (!isLogin && !fullName.trim()) {
      return Alert.alert('Missing Name', 'Please enter your full name.');
    }
    if (!isValidEmail(cleanEmail)) {
      return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    }
    if (cleanPassword.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
    }

    if (isLogin) {
      // Sign In Flow
      // Update or preserve user profile
      const currentProfile = await SpeechStorage.getProfile();
      await SpeechStorage.saveProfile({
        ...currentProfile,
        email: cleanEmail,
      });
      router.replace('/Homepage');
    } else {
      // Sign Up Flow - route to OTP verification
      const currentProfile = await SpeechStorage.getProfile();
      await SpeechStorage.saveProfile({
        ...currentProfile,
        name: fullName.trim(),
        email: cleanEmail,
      });
      router.push({
        pathname: '/otp',
        params: { email: cleanEmail },
      });
    }
  };

  const handleGoogleAuth = async () => {
    // Quick Demo Google SSO
    const currentProfile = await SpeechStorage.getProfile();
    await SpeechStorage.saveProfile({
      ...currentProfile,
      name: 'Alex Morgan',
      email: 'alex.morgan@gmail.com',
    });
    router.replace('/Homepage');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Logo */}
          <View style={styles.header}>
            <View style={styles.logoEmblem}>
              <Ionicons name="mic" size={32} color={Colors.onPrimary} />
              <View style={styles.waveletPulse} />
              <View style={styles.waveletCore} />
            </View>

            <Text style={styles.brandTitle}>SpeakUp</Text>

            <View style={styles.subtitleRow}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={13} color={Colors.primary} />
                <Text style={styles.aiBadgeText}>Gemini AI</Text>
              </View>
              <Text style={styles.subtitleText}>Master the Art of Speaking</Text>
            </View>
          </View>

          {/* Segmented Control */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, isLogin && styles.activeTab]}
              onPress={() => setIsLogin(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, !isLogin && styles.activeTab]}
              onPress={() => setIsLogin(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="person-outline" size={20} color={Colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Alex Morgan"
                    placeholderTextColor={Colors.outline}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={20} color={Colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="alex.morgan@example.com"
                  placeholderTextColor={Colors.outline}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                {isLogin && (
                  <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••••••"
                  placeholderTextColor={Colors.outline}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.outline}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* AI Coaching Benefit Card */}
            <View style={styles.benefitCard}>
              <Ionicons name="analytics" size={18} color={Colors.primary} style={styles.benefitIcon} />
              <Text style={styles.benefitText}>
                Real-time filler-word tracking, pacing metrics, and vocal tone AI diagnostics ready upon login.
              </Text>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity style={styles.primaryButton} onPress={handleAuth} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* SSO Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google SSO Button */}
            <TouchableOpacity style={styles.googleButton} onPress={handleGoogleAuth} activeOpacity={0.85}>
              <Ionicons name="logo-google" size={18} color="#DB4437" style={styles.googleIcon} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Notice */}
          <Text style={styles.footerNotice}>
            By continuing, you agree to SpeakUp&apos;s{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoEmblem: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  waveletPulse: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.secondaryContainer,
    opacity: 0.6,
  },
  waveletCore: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  subtitleText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  activeTabText: {
    fontWeight: '700',
    color: Colors.primary,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  benefitIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  benefitText: {
    flex: 1,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.outlineVariant,
    opacity: 0.5,
  },
  dividerLabel: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.outline,
    letterSpacing: 0.5,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  googleIcon: {
    marginRight: 8,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  footerNotice: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.outline,
    lineHeight: 18,
    marginTop: 24,
    paddingHorizontal: 12,
  },
  linkText: {
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
