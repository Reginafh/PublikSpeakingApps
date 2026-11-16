import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavBar } from '../components/BottomNavBar';
import { ScoreGauge } from '../components/ScoreGauge';
import { Colors } from '../constants/designSystem';
import { SpeechEvaluation, SpeechStorage, UserProfile } from '../services/speechStorage';

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [speeches, setSpeeches] = useState<SpeechEvaluation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('Elevator Pitch');

  const loadData = useCallback(async () => {
    const prof = await SpeechStorage.getProfile();
    const list = await SpeechStorage.getSpeeches();
    setProfile(prof);
    setSpeeches(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStartPractice = (scenarioName?: string) => {
    const scenario = scenarioName || selectedScenario;
    router.push({
      pathname: '/recording',
      params: { scenario },
    });
  };

  const handleViewSpeech = (id: string) => {
    router.push({
      pathname: '/evaluation',
      params: { id },
    });
  };

  const scenarios = [
    { id: 'Elevator Pitch', label: 'Elevator Pitch', icon: 'rocket-outline' },
    { id: 'Job Interview', label: 'Job Interview', icon: 'briefcase-outline' },
    { id: 'Storytelling', label: 'Storytelling', icon: 'book-outline' },
    { id: 'Executive Update', label: 'Executive Update', icon: 'stats-chart-outline' },
  ];

  const overallScore = profile?.overallScore ?? 84;
  const streakDays = profile?.streakDays ?? 5;
  const userName = profile?.name?.split(' ')[0] || 'Alex';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {/* Top App Bar */}
          <View style={styles.topBar}>
            <View style={styles.userSection}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{userName.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.logoTitle}>SpeakUp</Text>
                <Text style={styles.greetingText}>Hi, {userName}! 👋</Text>
              </View>
            </View>

            <View style={styles.topRight}>
              <View style={styles.streakBadge}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakText}>{streakDays} Days</Text>
              </View>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => router.push('/settings')}
              >
                <Ionicons name="settings-outline" size={20} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Overall Fluency Banner Card */}
          <View style={styles.fluencyCard}>
            <View style={styles.fluencyTopRow}>
              <View style={styles.fluencyLeft}>
                <View style={styles.geminiBadge}>
                  <Ionicons name="sparkles" size={12} color={Colors.secondary} />
                  <Text style={styles.geminiBadgeText}>Gemini Evaluated</Text>
                </View>

                <Text style={styles.fluencyTitle}>Overall Fluency Score</Text>
                <Text style={styles.fluencySubtitle}>Top 12% among peer speakers</Text>

                <View style={styles.trendRow}>
                  <Ionicons name="trending-up" size={16} color={Colors.secondary} />
                  <Text style={styles.trendText}>+6 pts this week</Text>
                </View>
              </View>

              {/* Radial Progress Gauge */}
              <View style={styles.gaugeWrapper}>
                <ScoreGauge score={overallScore} size={88} strokeWidth={8} />
              </View>
            </View>

            {/* Telemetry Breakdown Bar */}
            <View style={styles.telemetryBar}>
              <View style={styles.telemetryCol}>
                <Text style={styles.telemetryLabel}>Pace</Text>
                <Text style={[styles.telemetryValue, { color: Colors.primary }]}>
                  {profile?.averagePace ?? 142} wpm
                </Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryCol}>
                <Text style={styles.telemetryLabel}>Fillers</Text>
                <Text style={[styles.telemetryValue, { color: Colors.secondary }]}>
                  {profile?.averageFillersPct ?? 1.2}%
                </Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryCol}>
                <Text style={styles.telemetryLabel}>Clarity</Text>
                <Text style={[styles.telemetryValue, { color: Colors.primary }]}>
                  {profile?.averageClarityPct ?? 92}%
                </Text>
              </View>
            </View>
          </View>

          {/* Start Speaking Practice Quick-Action Card */}
          <View style={styles.practiceCard}>
            <View style={styles.practiceHeader}>
              <View>
                <View style={styles.liveTelemetryBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveTelemetryText}>Live AI Telemetry Ready</Text>
                </View>
                <Text style={styles.practiceTitle}>Start Speaking Practice</Text>
                <Text style={styles.practiceSubtitle}>Real-time cadence, fillers & tone coach</Text>
              </View>

              <TouchableOpacity
                style={styles.micCircleButton}
                onPress={() => handleStartPractice()}
                activeOpacity={0.85}
              >
                <Ionicons name="mic" size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Scenario Pills */}
            <View style={styles.scenarioSection}>
              <Text style={styles.scenarioLabel}>Select Target Scenario:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scenariosScroll}
              >
                {scenarios.map((sc) => {
                  const isSelected = selectedScenario === sc.id;
                  return (
                    <TouchableOpacity
                      key={sc.id}
                      style={[
                        styles.scenarioPill,
                        isSelected ? styles.scenarioPillSelected : styles.scenarioPillUnselected,
                      ]}
                      onPress={() => setSelectedScenario(sc.id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={sc.icon as any}
                        size={15}
                        color={isSelected ? Colors.primary : '#FFFFFF'}
                      />
                      <Text
                        style={[
                          styles.scenarioPillText,
                          { color: isSelected ? Colors.primary : '#FFFFFF' },
                        ]}
                      >
                        {sc.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          {/* Daily Gemini Tip Card */}
          <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
              <View style={styles.tipIconSquare}>
                <Ionicons name="bulb-outline" size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.tipTitle}>Daily Gemini Tip</Text>
                <Text style={styles.tipSubtitle}>Filler Word Reduction</Text>
              </View>
            </View>
            <Text style={styles.tipBody}>
              &quot;When you feel the impulse to say{' '}
              <Text style={styles.highlightPill}>&apos;um&apos;</Text> or{' '}
              <Text style={styles.highlightPill}>&apos;like&apos;</Text>, ground your breath and pause for 1 second. Silence conveys confidence, not hesitation.&quot;
            </Text>
          </View>

          {/* Recent Speeches Section */}
          <View style={styles.speechesSection}>
            <View style={styles.speechesHeader}>
              <Text style={styles.sectionTitle}>Recent Speeches</Text>
              {speeches.length > 0 && (
                <Text style={styles.speechesCount}>{speeches.length} Sessions</Text>
              )}
            </View>

            {speeches.length > 0 ? (
              speeches.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.speechItem}
                  onPress={() => handleViewSpeech(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.speechIconBox}>
                    <MaterialCommunityIcons
                      name="waveform"
                      size={22}
                      color={Colors.primary}
                    />
                  </View>

                  <View style={styles.speechDetails}>
                    <Text style={styles.speechTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.speechMeta}>
                      {item.date} • {item.durationDisplay}
                    </Text>
                  </View>

                  <View style={styles.speechScoreCol}>
                    <View style={styles.scorePill}>
                      <Ionicons name="star" size={11} color="#004D40" />
                      <Text style={styles.scorePillText}>{item.overallScore}/100</Text>
                    </View>
                    <Text style={styles.gradeSubtitle}>
                      {item.fillerWordsCount === 0
                        ? 'Zero Fillers'
                        : `${item.fillerWordsCount} Fillers`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="mic-outline" size={36} color={Colors.outline} />
                <Text style={styles.emptyTitle}>No Speeches Recorded Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap below to start your first speech analysis and unlock Gemini AI feedback.
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => handleStartPractice()}
                >
                  <Text style={styles.emptyButtonText}>Start First Practice</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Fixed Bottom Navigation Bar */}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 96,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryContainer,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  greetingText: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tertiaryFixed,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onTertiaryFixed,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fluencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 16,
  },
  fluencyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fluencyLeft: {
    flex: 1,
  },
  geminiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 6,
  },
  geminiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSecondaryContainer,
  },
  fluencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  fluencySubtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
  },
  gaugeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  telemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
  },
  telemetryCol: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    marginBottom: 2,
  },
  telemetryValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  telemetryDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.surfaceContainer,
  },
  practiceCard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  practiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  liveTelemetryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondaryFixed,
  },
  liveTelemetryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  practiceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  practiceSubtitle: {
    fontSize: 12,
    color: Colors.onPrimaryContainer,
    marginTop: 2,
  },
  micCircleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  scenarioSection: {
    marginTop: 14,
  },
  scenarioLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onPrimaryContainer,
    marginBottom: 8,
  },
  scenariosScroll: {
    gap: 8,
  },
  scenarioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  scenarioPillSelected: {
    backgroundColor: '#FFFFFF',
  },
  scenarioPillUnselected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  scenarioPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tipCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: 18,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  tipIconSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  tipSubtitle: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  tipBody: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },
  highlightPill: {
    backgroundColor: Colors.tertiaryFixed,
    color: Colors.onTertiaryFixed,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  speechesSection: {
    marginBottom: 16,
  },
  speechesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  speechesCount: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  speechItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  speechIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  speechDetails: {
    flex: 1,
  },
  speechTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 2,
  },
  speechMeta: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  speechScoreCol: {
    alignItems: 'flex-end',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F7FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  scorePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#004D40',
  },
  gradeSubtitle: {
    fontSize: 10,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 3,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 260,
  },
  emptyButton: {
    marginTop: 14,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
