import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavBar } from '../components/BottomNavBar';
import { Colors } from '../constants/designSystem';
import { SpeechStorage, UserProfile } from '../services/speechStorage';

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [liveTelemetryEnabled, setLiveTelemetryEnabled] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [isSavingKey, setIsSavingKey] = useState(false);

  useEffect(() => {
    (async () => {
      const prof = await SpeechStorage.getProfile();
      setProfile(prof);
      const savedKey = await SpeechStorage.getApiKey();
      if (savedKey) setApiKey(savedKey);
    })();
  }, []);

  const handleSaveApiKey = async () => {
    setIsSavingKey(true);
    await SpeechStorage.saveApiKey(apiKey.trim());
    setIsSavingKey(false);
    Alert.alert('Saved', 'Gemini API key has been securely saved.');
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Speeches?',
      'This will reset your practice history and streaks back to initial demo data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await SpeechStorage.clearAll();
            Alert.alert('Reset Complete', 'Storage refreshed.', [
              { text: 'OK', onPress: () => router.replace('/Homepage') },
            ]);
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of SpeakUp?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => router.replace('/') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings & AI Engine</Text>
          <View style={{ width: 32 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* User Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarText}>
                  {profile?.name ? profile.name.charAt(0) : 'A'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.name || 'Alex Morgan'}</Text>
                <Text style={styles.profileEmail}>
                  {profile?.email || 'alex.morgan@example.com'}
                </Text>
                <View style={styles.streakRow}>
                  <Text style={styles.streakTag}>🔥 {profile?.streakDays ?? 5} Day Streak</Text>
                  <Text style={styles.scoreTag}>Score: {profile?.overallScore ?? 84}/100</Text>
                </View>
              </View>
            </View>

            {/* Gemini AI API Configuration */}
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={styles.aiIconBox}>
                  <Ionicons name="sparkles" size={16} color={Colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Gemini AI Integration</Text>
              </View>

              <Text style={styles.cardDescription}>
                SpeakUp uses Google Gemini 2.5 Flash / 1.5 Flash to grade your speeches and generate constructive coaching advice.
              </Text>

              <Text style={styles.inputLabel}>Custom Gemini API Key (Optional)</Text>
              <View style={styles.apiKeyInputBox}>
                <Ionicons name="key-outline" size={18} color={Colors.outline} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.apiKeyInput}
                  placeholder="AIzaSy..."
                  placeholderTextColor={Colors.outline}
                  value={apiKey}
                  onChangeText={setApiKey}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <Text style={styles.apiHelpText}>
                *If empty, SpeakUp&apos;s built-in intelligent evaluation engine runs locally with full 0-100 objective telemetry.
              </Text>

              <TouchableOpacity
                style={styles.saveKeyBtn}
                onPress={handleSaveApiKey}
                activeOpacity={0.85}
              >
                <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                <Text style={styles.saveKeyBtnText}>
                  {isSavingKey ? 'Saving...' : 'Save API Key'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Preferences */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Practice Preferences</Text>

              <View style={styles.preferenceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prefTitle}>Live Acoustic Waveform</Text>
                  <Text style={styles.prefDesc}>Display animated telemetry bars during recording</Text>
                </View>
                <Switch
                  value={liveTelemetryEnabled}
                  onValueChange={setLiveTelemetryEnabled}
                  trackColor={{ false: Colors.surfaceContainer, true: Colors.primaryContainer }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.preferenceDivider} />

              <View style={styles.preferenceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prefTitle}>Optimal Pacing Guidance</Text>
                  <Text style={styles.prefDesc}>Alert when WPM exceeds 165 or drops below 110</Text>
                </View>
                <Switch
                  value={hapticFeedback}
                  onValueChange={setHapticFeedback}
                  trackColor={{ false: Colors.surfaceContainer, true: Colors.primaryContainer }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Account Actions */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Data & Account</Text>

              <TouchableOpacity style={styles.actionRow} onPress={handleResetData}>
                <Ionicons name="refresh-circle-outline" size={20} color={Colors.onSurfaceVariant} />
                <Text style={styles.actionRowText}>Reset Practice History to Demo</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.outline} />
              </TouchableOpacity>

              <View style={styles.preferenceDivider} />

              <TouchableOpacity style={styles.actionRow} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                <Text style={[styles.actionRowText, { color: Colors.error }]}>Log Out</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.outline} />
              </TouchableOpacity>
            </View>

            <Text style={styles.versionFooter}>SpeakUp Vocal Intelligence • Version 1.0.0</Text>
          </ScrollView>
        </KeyboardAvoidingView>

        <BottomNavBar />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceContainerHigh,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 96,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  profileEmail: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  streakTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onTertiaryFixed,
    backgroundColor: Colors.tertiaryFixed,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  scoreTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSecondaryContainer,
    backgroundColor: Colors.secondaryFixed,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  cardDescription: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
  },
  apiKeyInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
  },
  apiKeyInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.onSurface,
  },
  apiHelpText: {
    fontSize: 11,
    color: Colors.outline,
    marginTop: 6,
    lineHeight: 16,
  },
  saveKeyBtn: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveKeyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  prefDesc: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  preferenceDivider: {
    height: 1,
    backgroundColor: Colors.surfaceContainerLow,
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  actionRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  versionFooter: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.outline,
    marginTop: 8,
    marginBottom: 16,
  },
});
