import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Email
  const [email, setEmail] = useState('');

  // Step 2: OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<any[]>([]);

  // Step 3: New Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (emailText: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailText.trim());
  };

  const handleSendCode = () => {
    if (!email.trim()) {
      return Alert.alert('Missing Email', 'Please enter your email address.');
    }
    if (!isValidEmail(email)) {
      return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    }
    Alert.alert('Code Sent', `We sent a 6-digit verification code to ${email.trim()}.`);
    setStep(2);
  };

  const handleOtpChange = (text: string, index: number) => {
    const numeric = text.replace(/[^0-9]/g, '');
    const newArr = [...otp];
    newArr[index] = numeric;
    setOtp(newArr);

    if (numeric && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = () => {
    const code = otp.join('');
    if (code.length < 6) {
      return Alert.alert('Incomplete Code', 'Please enter all 6 digits of the code.');
    }
    // Any valid 6 digit or 123456
    setStep(3);
  };

  const handleResetPassword = () => {
    if (!newPassword || !confirmPassword) {
      return Alert.alert('Missing Password', 'Please enter and confirm your new password.');
    }
    if (newPassword.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert('Mismatch', 'Passwords do not match. Please try again.');
    }

    Alert.alert(
      'Password Updated',
      'Your password has been successfully reset! You can now log in with your new password.',
      [{ text: 'Log In Now', onPress: () => router.replace('/') }]
    );
  };

  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else if (step === 2) {
      setStep(1);
    } else {
      setStep(2);
    }
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
          {/* Top Bar */}
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={step === 1 ? 'mail-unread' : step === 2 ? 'keypad' : 'lock-closed'}
                size={30}
                color={Colors.onPrimary}
              />
            </View>

            <Text style={styles.title}>
              {step === 1 && 'Reset Password'}
              {step === 2 && 'Verify Your Email'}
              {step === 3 && 'Create New Password'}
            </Text>

            <Text style={styles.subtitle}>
              {step === 1 && 'Enter your email address and we will send you a 6-digit verification code.'}
              {step === 2 && `Enter the 6-digit code sent to ${email.trim() || 'your email'}.`}
              {step === 3 && 'Choose a secure password of at least 6 characters.'}
            </Text>

            {/* Stepper Dots */}
            <View style={styles.stepIndicatorRow}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    step === s && styles.stepDotActive,
                    step > s && styles.stepDotCompleted,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Step 1: Email Form */}
          {step === 1 && (
            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Registered Email</Text>
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
                  autoFocus
                />
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleSendCode} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <View style={styles.formCard}>
              <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
              <View style={styles.otpRow}>
                {otp.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={(txt) => handleOtpChange(txt, idx)}
                    onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                    keyboardType="number-pad"
                    maxLength={1}
                    autoFocus={idx === 0}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyOtp} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Verify & Proceed</Text>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={() => Alert.alert('Code Resent', 'A fresh 6-digit code was sent to your email.')}
              >
                <Text style={styles.resendText}>Didn&apos;t receive code? Resend</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="At least 6 characters"
                    placeholderTextColor={Colors.outline}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoFocus
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.outline}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={Colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Repeat new password"
                    placeholderTextColor={Colors.outline}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleResetPassword} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>Update Password</Text>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
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
    paddingVertical: 16,
    flexGrow: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.outlineVariant,
  },
  stepDotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: Colors.secondary,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.onSurface,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 18,
  },
  resendText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
});
