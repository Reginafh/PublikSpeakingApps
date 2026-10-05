import React, { useState, useRef } from 'react';
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
import { useRouter } from 'expo-router';

export default function OTPScreen() {
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Handles text input and auto-advances to the next box
  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    
    const newOtp = [...otp];
    newOtp[index] = numericText;
    setOtp(newOtp);

    // Auto-focus next input if a number was typed
    if (numericText && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handles backspace to jump to the previous box
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const otpString = otp.join('');

    // 1. Length validation
    if (otpString.length < 6) {
      return Alert.alert('Error', 'Please enter the complete 6-digit code.');
    }
    
    // 2. MOCK BACKEND VALIDATION (Replace with Firebase verification later)
    // For testing purposes, the correct code is hardcoded to "123456"
    const MOCK_CORRECT_OTP = '123456';
    
    if (otpString !== MOCK_CORRECT_OTP) {
      return Alert.alert('Error', 'Incorrect verification code. Please try again.');
    }
    
    // TODO: Verify the OTP with your backend here
    Alert.alert('Success', 'Email verified successfully!', [
      { text: 'OK', onPress: () => router.replace('/') } // Go to home screen
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Verification</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to your email. Enter it below to verify your account.
          </Text>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              ref={(el) => {inputRefs.current[index] = el}}
              autoFocus={index === 0} // Auto-focus the first box on load
            />
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleVerify}>
          <Text style={styles.buttonText}>Verify Code</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendButton} onPress={() => Alert.alert('Sent', 'New code sent!')}>
          <Text style={styles.resendText}>Didn't receive a code? Resend</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 40, left: 24, zIndex: 10 },
  backText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#777', textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  otpInputFilled: {
    borderColor: '#007AFF', // Highlights the box when it has a number
    backgroundColor: '#ebf4ff',
  },

  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resendButton: { marginTop: 24, alignItems: 'center' },
  resendText: { color: '#777', fontSize: 14 },
});