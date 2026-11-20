import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { apiRequest, AuthStorage, extractUidFromJwt } from '../services/api';

export default function OTPScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<any[]>([]);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const handleChange = (text: string, index: number) => {
    const numericText = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = numericText;
    setOtp(newOtp);

    if (numericText && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length < 6) {
      return Alert.alert('Incomplete Code', 'Please enter all 6 digits.');
    }
    if (!email) {
      return Alert.alert('Error', 'Email parameter is missing.');
    }

    setIsVerifying(true);
    try {
      const res = await apiRequest<{
        status: string;
        message: string;
        token: string | null;
      }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp_code: otpString,
        }),
      });

      if (res.token) {
        const userId = extractUidFromJwt(res.token);
        await AuthStorage.saveSession({
          userId,
          email: email.trim().toLowerCase(),
          token: res.token,
        });
      }

      Alert.alert('Success', res.message, [
        { text: 'Get Started', onPress: () => router.replace('/Homepage') },
      ]);
    }
    catch (error: any){
      Alert.alert('Verification Failed', error.message);
    } 
    finally{
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !email) return;

    try{
      const res = await apiRequest<{ status: string; message: string }>(
        '/auth/resend-otp',
        {
          method: 'POST',
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        }
      );

      setCountdown(60);
      Alert.alert('Code Resent', res.message);
    }
    catch (error:any){
      Alert.alert('Resend Failed', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.onPrimary} />
            </View>
            <Text style={styles.title}>Account Verification</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit confirmation code to{' '}
              <Text style={styles.emailHighlight}>{email || 'your email address'}</Text>.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  autoFocus={index === 0}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleVerify} activeOpacity={0.85}>
              <Text style={styles.buttonText}>Verify Account</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.resendRow}>
              {countdown > 0 ? (
                <Text style={styles.countdownText}>Resend code in {countdown}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendActionText}>Resend verification code</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
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
  container: {
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  emailHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  card: {
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  otpInput: {
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
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  countdownText: {
    fontSize: 13,
    color: Colors.outline,
    fontWeight: '500',
  },
  resendActionText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
});
