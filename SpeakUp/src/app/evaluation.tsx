import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScoreGauge } from '../components/ScoreGauge';
import { Colors } from '../constants/designSystem';
import { SpeechEvaluation, SpeechStorage } from '../services/speechStorage';

export default function EvaluationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [speech, setSpeech] = useState<SpeechEvaluation | null>(null);
  const [loading, setLoading] = useState(true);

  // Audio player setup
  const player = useAudioPlayer(speech?.audioUri || '');
  const playerStatus = useAudioPlayerStatus(player);
  const isPlaying = playerStatus.playing;

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (params.id) {
        const found = await SpeechStorage.getSpeechById(params.id);
        if (found) {
          setSpeech(found);
          setLoading(false);
          return;
        }
      }
      // Fallback: load the most recent speech or default
      const list = await SpeechStorage.getSpeeches();
      if (list.length > 0) {
        setSpeech(list[0]);
      }
      setLoading(false);
    })();
  }, [params.id]);

  const togglePlayback = () => {
    if (!speech?.audioUri) {
      Alert.alert(
        'Audio Playback',
        'Audio was recorded and processed. In physical device mode, your exact mic recording plays back here.'
      );
      return;
    }
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleShare = async () => {
    if (!speech) return;
    try {
      await Share.share({
        message: `I scored ${speech.overallScore}/100 on my ${speech.scenario} using SpeakUp AI Speech Coach! 🎙️✨`,
      });
    } catch {}
  };

  const handleReRecord = () => {
    router.replace({
      pathname: '/recording',
      params: { scenario: speech?.scenario || 'Elevator Pitch' },
    });
  };

  if (loading || !speech) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading speech evaluation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const {
    title,
    scenario,
    overallScore,
    gradeClassification,
    percentileText,
    durationDisplay,
    wpm,
    telemetryBreakdown,
    keyStrengths,
    aiSuggestions,
  } = speech;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/Homepage')}>
            <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.scenarioDotRow}>
              <View style={styles.activeDot} />
              <Text style={styles.headerScenarioText}>{scenario}</Text>
            </View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <View style={styles.geminiBadge}>
            <Ionicons name="sparkles" size={13} color={Colors.primary} />
            <Text style={styles.geminiBadgeText}>Gemini AI</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Score Gauge Bento Card */}
          <View style={styles.heroScoreCard}>
            {/* Ambient Background Blur Highlights */}
            <View style={styles.glowSecondary} />
            <View style={styles.glowPrimary} />

            <View style={styles.heroScoreCenter}>
              <View style={styles.gaugeWrapper}>
                <ScoreGauge score={overallScore} size={150} strokeWidth={12} />
              </View>

              <View style={styles.classificationPill}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.onPrimaryFixed} />
                <Text style={styles.classificationText}>{gradeClassification}</Text>
              </View>

              <Text style={styles.verifiedEngineText}>
                Verified by Gemini Speech Engine • {percentileText}
              </Text>
            </View>

            {/* Audio Playback Bar */}
            <View style={styles.audioBar}>
              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayback}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={18}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <View style={styles.audioMeta}>
                <Text style={styles.audioMetaTitle}>Recorded Practice Audio</Text>
                <Text style={styles.audioMetaSubtitle}>
                  {durationDisplay} • {wpm} WPM (Optimal Cadence)
                </Text>
              </View>

              <View style={styles.percentilePill}>
                <Text style={styles.percentilePillText}>{percentileText}</Text>
              </View>
            </View>
          </View>

          {/* Telemetry Breakdown (4 Dimensions) */}
          <View style={styles.breakdownCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Telemetry Breakdown</Text>
              <Text style={styles.sectionSubtitle}>4 Dimensions</Text>
            </View>

            {/* Dimension 1: Main Point Clarity */}
            <View style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <View style={styles.metricTitleGroup}>
                  <Ionicons name="bulb-outline" size={16} color={Colors.secondary} />
                  <Text style={styles.metricLabelText}>Main Point Clarity</Text>
                </View>
                <Text style={styles.metricScoreText}>
                  {telemetryBreakdown.mainPointClarity.score}
                  <Text style={styles.metricMaxScore}>/100</Text>
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${telemetryBreakdown.mainPointClarity.score}%`,
                      backgroundColor: Colors.secondary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.metricComment}>
                {telemetryBreakdown.mainPointClarity.comment}
              </Text>
            </View>

            {/* Dimension 2: Structure & Flow */}
            <View style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <View style={styles.metricTitleGroup}>
                  <Ionicons name="git-network-outline" size={16} color={Colors.primary} />
                  <Text style={styles.metricLabelText}>Structure & Flow</Text>
                </View>
                <Text style={styles.metricScoreText}>
                  {telemetryBreakdown.structureAndFlow.score}
                  <Text style={styles.metricMaxScore}>/100</Text>
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${telemetryBreakdown.structureAndFlow.score}%`,
                      backgroundColor: Colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.metricComment}>
                {telemetryBreakdown.structureAndFlow.comment}
              </Text>
            </View>

            {/* Dimension 3: Pacing & Tone */}
            <View style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <View style={styles.metricTitleGroup}>
                  <Ionicons name="speedometer-outline" size={16} color={Colors.secondary} />
                  <Text style={styles.metricLabelText}>Pacing & Tone</Text>
                </View>
                <Text style={styles.metricScoreText}>
                  {telemetryBreakdown.pacingAndTone.score}
                  <Text style={styles.metricMaxScore}>/100</Text>
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${telemetryBreakdown.pacingAndTone.score}%`,
                      backgroundColor: Colors.secondary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.metricComment}>
                {telemetryBreakdown.pacingAndTone.comment}
              </Text>
            </View>

            {/* Dimension 4: Vocabulary & Fillers */}
            <View style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <View style={styles.metricTitleGroup}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.tertiary} />
                  <Text style={styles.metricLabelText}>Vocabulary & Filler Words</Text>
                </View>
                <View style={styles.fillersScoreGroup}>
                  <Text style={styles.metricScoreText}>
                    {telemetryBreakdown.vocabularyAndFillers.score}
                    <Text style={styles.metricMaxScore}>/100</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${telemetryBreakdown.vocabularyAndFillers.score}%`,
                      backgroundColor: Colors.tertiary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.metricComment}>
                {telemetryBreakdown.vocabularyAndFillers.comment}
              </Text>
            </View>
          </View>

          {/* Key Strengths Section */}
          <View style={styles.card}>
            <View style={styles.cardHeaderTitleRow}>
              <View style={styles.strengthIconBox}>
                <Ionicons name="thumbs-up" size={16} color={Colors.secondary} />
              </View>
              <Text style={styles.sectionTitle}>Key Strengths</Text>
            </View>

            <View style={styles.strengthsList}>
              {keyStrengths.map((ks, idx) => (
                <View key={idx} style={styles.strengthItem}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.secondary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.strengthItemTitle}>{ks.title}</Text>
                    <Text style={styles.strengthItemDesc}>{ks.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Gemini AI Improvement Suggestions */}
          <View style={styles.card}>
            <View style={styles.cardHeaderTitleRow}>
              <View style={styles.aiCoachingIconBox}>
                <Ionicons name="school" size={16} color={Colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Gemini AI Coaching</Text>
              <View style={styles.actionsPill}>
                <Text style={styles.actionsPillText}>{aiSuggestions.length} Actions</Text>
              </View>
            </View>

            <View style={styles.suggestionsList}>
              {aiSuggestions.map((sug, idx) => {
                const isFluency = sug.type === 'fluency';
                const borderColor = isFluency ? Colors.tertiaryContainer : Colors.primary;
                return (
                  <View
                    key={idx}
                    style={[styles.suggestionItem, { borderLeftColor: borderColor }]}
                  >
                    <View style={styles.suggestionCategoryRow}>
                      <Ionicons
                        name={isFluency ? 'pause-circle' : 'trending-up'}
                        size={15}
                        color={isFluency ? Colors.tertiary : Colors.primary}
                      />
                      <Text
                        style={[
                          styles.suggestionCategoryText,
                          { color: isFluency ? Colors.tertiary : Colors.primary },
                        ]}
                      >
                        {sug.category}
                      </Text>
                    </View>

                    <Text style={styles.suggestionTitle}>{sug.title}</Text>
                    <Text style={styles.suggestionDesc}>{sug.description}</Text>

                    <View style={styles.suggestionFooter}>
                      <View style={styles.timestampChip}>
                        <Ionicons name="time-outline" size={12} color={Colors.secondary} />
                        <Text style={styles.timestampChipText}>
                          Timestamp {sug.timestamp}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.practiceSnippetBtn}
                        onPress={() =>
                          Alert.alert(
                            'Snippet Practice',
                            `Focus on this advice: "${sug.title}" when you re-record.`
                          )
                        }
                      >
                        <Text style={styles.practiceSnippetText}>Practice snippet</Text>
                        <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* CTAs */}
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.reRecordBtn} onPress={handleReRecord} activeOpacity={0.85}>
              <Ionicons name="mic" size={18} color="#FFFFFF" />
              <Text style={styles.reRecordBtnText}>Re-record Speech</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Ionicons name="share-social-outline" size={18} color={Colors.primary} />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
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
  headerCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  scenarioDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
  },
  headerScenarioText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  geminiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  geminiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  heroScoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  glowSecondary: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.secondaryFixed,
    opacity: 0.35,
  },
  glowPrimary: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryFixed,
    opacity: 0.3,
  },
  heroScoreCenter: {
    alignItems: 'center',
    marginBottom: 14,
  },
  gaugeWrapper: {
    marginVertical: 4,
  },
  classificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    marginTop: 8,
  },
  classificationText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onPrimaryFixed,
  },
  verifiedEngineText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 6,
    fontWeight: '500',
  },
  audioBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerLow,
    gap: 10,
  },
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioMeta: {
    flex: 1,
  },
  audioMetaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  audioMetaSubtitle: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 1,
  },
  percentilePill: {
    backgroundColor: Colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  percentilePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSecondaryFixedVariant,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.outline,
    fontWeight: '600',
  },
  metricRow: {
    marginBottom: 14,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  metricScoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  metricMaxScore: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
  },
  fillersScoreGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTrack: {
    height: 7,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 9999,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 9999,
  },
  metricComment: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: 16,
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  strengthIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCoachingIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsPill: {
    marginLeft: 'auto',
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  actionsPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  strengthsList: {
    gap: 10,
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.surfaceContainerLow,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  strengthItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  strengthItemDesc: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    lineHeight: 16,
    marginTop: 2,
  },
  suggestionsList: {
    gap: 12,
  },
  suggestionItem: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    padding: 12,
  },
  suggestionCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  suggestionCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.onSurface,
    lineHeight: 18,
  },
  suggestionDesc: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    lineHeight: 17,
    marginTop: 4,
  },
  suggestionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainer,
  },
  timestampChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timestampChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondary,
  },
  practiceSnippetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  practiceSnippetText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  reRecordBtn: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  reRecordBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  shareBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.primaryFixed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
