import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { Colors } from '../constants/designSystem';
import { GeminiService } from '../services/gemini';
import { FillerWordOccurrence, SpeechStorage } from '../services/speechStorage';

export default function RecordingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scenario?: string }>();
  const scenarioTitle = params.scenario || 'Elevator Pitch';

  // Setup expo-audio recorder
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Session State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [wpm, setWpm] = useState(135);
  const [clarity] = useState(94);
  const [fillerWords, setFillerWords] = useState<FillerWordOccurrence[]>([
    { word: 'um', timestamp: '00:15' },
  ]);
  const [transcript, setTranscript] = useState(
    "Good morning everyone. Today I'm presenting SpeakUp, our AI-powered speech coaching platform that delivers objective 0-100 grading. Um, with real-time feedback, anyone can master public speaking."
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationStatusText, setEvaluationStatusText] = useState('Evaluating delivery...');

  // Target objectives based on scenario
  const [objectives, setObjectives] = useState([
    { id: '1', title: 'Hook audience in first 15 seconds', completed: true },
    { id: '2', title: 'Introduce core problem & product solution', completed: true },
    { id: '3', title: 'Deliver actionable call to action', completed: false },
  ]);

  const timerRef = useRef<any>(null);

  // Initialize Audio & Permissions
  useEffect(() => {
    (async () => {
      try {
        const perm = await AudioModule.requestRecordingPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Microphone Permission',
            'Please allow microphone access in your device settings to enable speech analysis.'
          );
        }
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      } catch (e) {
        console.warn('Audio setup warning:', e);
      }
    })();
  }, []);

  // Timer interval
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed((prev) => {
          const next = prev + 1;
          // Dynamically adjust simulated pacing around 130-145 wpm
          if (next % 4 === 0) {
            setWpm(130 + Math.floor(Math.sin(next) * 12));
          }
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Start recording
  const handleStart = async () => {
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setIsPaused(false);
    } catch {
      // In web or simulator without hardware mic, still allow simulation
      setIsRecording(true);
      setIsPaused(false);
    }
  };

  // Pause / Resume
  const handleTogglePause = () => {
    if (isPaused) {
      try {
        audioRecorder.record();
      } catch {}
      setIsPaused(false);
    } else {
      try {
        audioRecorder.pause();
      } catch {}
      setIsPaused(true);
    }
  };

  // Log a filler word quickly during practice
  const handleAddFiller = (filler: string) => {
    const mins = Math.floor(secondsElapsed / 60);
    const secs = secondsElapsed % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    setFillerWords((prev) => [...prev, { word: filler, timestamp: timeStr }]);
  };

  // Toggle objective checkbox
  const toggleObjective = (id: string) => {
    setObjectives((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, completed: !obj.completed } : obj))
    );
  };

  // Finish Recording & run Gemini Evaluation
  const handleFinish = async () => {
    try {
      if (audioRecorder) {
        await audioRecorder.stop();
      }
    } catch {}

    setIsRecording(false);
    setIsEvaluating(true);
    setEvaluationStatusText('Gemini AI is analyzing your thesis, pacing & telemetry...');

    try {
      const evaluation = await GeminiService.evaluateSpeech({
        title: `${scenarioTitle} Session`,
        scenario: scenarioTitle,
        transcript: transcript.trim() || 'Recorded speech practice session with SpeakUp AI coach.',
        durationSeconds: Math.max(secondsElapsed, 45),
        detectedFillers: fillerWords,
        audioUri: audioRecorder.uri || undefined,
      });

      // Save evaluation to local storage
      await SpeechStorage.saveSpeech(evaluation);

      setIsEvaluating(false);
      router.replace({
        pathname: '/evaluation',
        params: { id: evaluation.id },
      });
    } catch {
      setIsEvaluating(false);
      Alert.alert('Evaluation Error', 'Failed to generate speech analysis. Please try again.');
    }
  };

  // Format timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const completedObjectivesCount = objectives.filter((o) => o.completed).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Contextual Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (isRecording) {
                Alert.alert(
                  'Exit Practice?',
                  'Your current recording session will be discarded.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Exit', style: 'destructive', onPress: () => router.back() },
                  ]
                );
              } else {
                router.back();
              }
            }}
          >
            <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.liveIndicatorRow}>
              <View
                style={[
                  styles.liveDot,
                  { backgroundColor: isRecording && !isPaused ? Colors.tertiaryContainer : Colors.outline },
                ]}
              />
              <Text
                style={[
                  styles.liveLabel,
                  { color: isRecording && !isPaused ? Colors.tertiary : Colors.onSurfaceVariant },
                ]}
              >
                {isRecording ? (isPaused ? 'PAUSED' : 'LIVE RECORDING') : 'READY TO RECORD'}
              </Text>
            </View>
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {scenarioTitle}
            </Text>
          </View>

          {/* Session Timer Pill */}
          <View style={styles.timerPill}>
            <Ionicons name="timer-outline" size={15} color={Colors.primary} />
            <Text style={styles.timerText}>{formatTime(secondsElapsed)}</Text>
            <Text style={styles.targetLimitText}>/ 2m</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Live Telemetry HUD (Pacing & Fillers) */}
          <View style={styles.hudGrid}>
            {/* Pacing Indicator Card */}
            <View style={styles.hudCard}>
              <View style={styles.hudCardTop}>
                <View style={styles.hudIconTitleRow}>
                  <Ionicons name="speedometer-outline" size={16} color={Colors.secondary} />
                  <Text style={styles.hudCardLabel}>Speaking Pace</Text>
                </View>
                <View style={styles.statusBadgeOptimal}>
                  <Text style={styles.statusBadgeText}>
                    {wpm >= 125 && wpm <= 165 ? 'OPTIMAL' : wpm < 125 ? 'SLOW' : 'FAST'}
                  </Text>
                </View>
              </View>

              <View style={styles.hudMetricRow}>
                <Text style={styles.hudMetricValue}>{wpm}</Text>
                <Text style={styles.hudMetricUnit}>wpm</Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(10, (wpm / 180) * 100))}%`,
                      backgroundColor: Colors.secondary,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Filler Word Tracker Card */}
            <View style={styles.hudCard}>
              <View style={styles.hudCardTop}>
                <View style={styles.hudIconTitleRow}>
                  <Ionicons name="pulse" size={16} color={Colors.tertiary} />
                  <Text style={styles.hudCardLabel}>Filler Words</Text>
                </View>
                {fillerWords.length > 0 && (
                  <View style={styles.statusBadgeAlert}>
                    <Text style={styles.statusBadgeAlertText}>ALERT</Text>
                  </View>
                )}
              </View>

              <View style={styles.hudMetricRow}>
                <Text style={[styles.hudMetricValue, { color: Colors.tertiary }]}>
                  {fillerWords.length}
                </Text>
                <Text style={[styles.hudMetricUnit, { color: Colors.tertiary }]}>
                  detected
                </Text>
              </View>

              <View style={styles.fillerChipsRow}>
                {fillerWords.slice(-2).map((fw, idx) => (
                  <View key={idx} style={styles.fillerPill}>
                    <Text style={styles.fillerPillText}>
                      {`${fw.timestamp} "${fw.word}"`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Acoustic Waveform & Amplitude Telemetry */}
          <View style={styles.waveformCard}>
            <View style={styles.waveformHeader}>
              <View style={styles.waveformStatusLeft}>
                <View style={styles.pulseDot} />
                <Text style={styles.waveformTitle}>Live Acoustic Amplitude</Text>
              </View>
              <View style={styles.clarityPill}>
                <Ionicons name="volume-high" size={13} color={Colors.secondary} />
                <Text style={styles.clarityText}>Clarity: {clarity}%</Text>
              </View>
            </View>

            {/* Dynamic Animated Bars */}
            <AudioVisualizer isRecording={isRecording && !isPaused} height={80} barCount={26} />

            {/* Realtime Stream Excerpt */}
            <View style={styles.transcriptTeaser}>
              <Ionicons name="hardware-chip-outline" size={16} color={Colors.primary} style={{ marginTop: 2 }} />
              <Text style={styles.transcriptTeaserText} numberOfLines={2}>
                {`"${transcript.slice(-120)}"`}
              </Text>
            </View>
          </View>

          {/* Speech Transcript & Teleprompter Editor */}
          <View style={styles.transcriptCard}>
            <View style={styles.transcriptCardHeader}>
              <View style={styles.iconTitleRow}>
                <Ionicons name="chatbubbles-outline" size={18} color={Colors.primary} />
                <Text style={styles.cardHeaderTitle}>Live Speech Transcript</Text>
              </View>
              <Text style={styles.transcriptWordCount}>
                {transcript.trim().split(/\s+/).filter(Boolean).length} words
              </Text>
            </View>

            <TextInput
              style={styles.transcriptInput}
              multiline
              value={transcript}
              onChangeText={setTranscript}
              placeholder="Speak aloud or adjust your speech draft here..."
              placeholderTextColor={Colors.outline}
            />

            {/* Quick Filler Detection Buttons for Live Testing */}
            <View style={styles.quickFillersRow}>
              <Text style={styles.quickFillerHint}>Tap to simulate filler:</Text>
              {['um', 'uh', 'like', 'you know'].map((word) => (
                <TouchableOpacity
                  key={word}
                  style={styles.quickFillerBtn}
                  onPress={() => handleAddFiller(word)}
                >
                  <Text style={styles.quickFillerBtnText}>+{word}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Key Objectives Checklist */}
          <View style={styles.objectivesCard}>
            <View style={styles.objectivesHeader}>
              <View style={styles.iconTitleRow}>
                <Ionicons name="checkbox-outline" size={18} color={Colors.primary} />
                <Text style={styles.cardHeaderTitle}>Key Objectives Checklist</Text>
              </View>
              <Text style={styles.objectivesProgressText}>
                {completedObjectivesCount} of {objectives.length} hit
              </Text>
            </View>

            <View style={styles.objectivesList}>
              {objectives.map((obj) => (
                <TouchableOpacity
                  key={obj.id}
                  style={[styles.objectiveItem, obj.completed && styles.objectiveItemCompleted]}
                  onPress={() => toggleObjective(obj.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={obj.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={obj.completed ? Colors.secondary : Colors.outline}
                  />
                  <Text
                    style={[
                      styles.objectiveTitle,
                      obj.completed && styles.objectiveTitleCompleted,
                    ]}
                  >
                    {obj.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Bottom Recording Control Dock */}
        <View style={styles.bottomDock}>
          {!isRecording ? (
            <TouchableOpacity style={styles.recordStartButton} onPress={handleStart} activeOpacity={0.85}>
              <Ionicons name="mic" size={24} color="#FFFFFF" />
              <Text style={styles.recordStartText}>Start Recording Speech</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.activeDockRow}>
              {/* Pause / Resume Button */}
              <TouchableOpacity
                style={styles.dockSecondaryBtn}
                onPress={handleTogglePause}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isPaused ? 'play' : 'pause'}
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.dockSecondaryText}>{isPaused ? 'Resume' : 'Pause'}</Text>
              </TouchableOpacity>

              {/* Finish & Evaluate Button */}
              <TouchableOpacity
                style={styles.dockPrimaryBtn}
                onPress={handleFinish}
                activeOpacity={0.85}
              >
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                <Text style={styles.dockPrimaryText}>Evaluate with Gemini</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Evaluation Loading Modal */}
        <Modal visible={isEvaluating} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.evaluatingCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.evaluatingTitle}>Gemini AI Evaluation</Text>
              <Text style={styles.evaluatingSubtitle}>{evaluationStatusText}</Text>
              <View style={styles.evaluatingPill}>
                <Ionicons name="sparkles" size={14} color={Colors.primary} />
                <Text style={styles.evaluatingPillText}>Grading Objective 0-100</Text>
              </View>
            </View>
          </View>
        </Modal>
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
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginTop: 1,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    gap: 4,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  targetLimitText: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },
  hudGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  hudCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  hudCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hudIconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hudCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  statusBadgeOptimal: {
    backgroundColor: Colors.secondaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.onSecondaryFixedVariant,
  },
  statusBadgeAlert: {
    backgroundColor: Colors.errorContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  statusBadgeAlertText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.onErrorContainer,
  },
  hudMetricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 4,
  },
  hudMetricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  hudMetricUnit: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  fillerChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  fillerPill: {
    backgroundColor: Colors.tertiaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  fillerPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.onTertiaryFixed,
  },
  waveformCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  waveformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  waveformStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  waveformTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  clarityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 4,
  },
  clarityText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary,
  },
  transcriptTeaser: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceBright,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginTop: 10,
    gap: 8,
  },
  transcriptTeaserText: {
    flex: 1,
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  transcriptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
    marginBottom: 14,
  },
  transcriptCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  transcriptWordCount: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  transcriptInput: {
    minHeight: 80,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: Colors.onSurface,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  quickFillersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  quickFillerHint: {
    fontSize: 11,
    color: Colors.outline,
  },
  quickFillerBtn: {
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quickFillerBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  objectivesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  objectivesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  objectivesProgressText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary,
  },
  objectivesList: {
    gap: 8,
  },
  objectiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.surfaceContainerHigh,
  },
  objectiveItemCompleted: {
    backgroundColor: Colors.surfaceBright,
  },
  objectiveTitle: {
    fontSize: 12,
    color: Colors.onSurface,
    flex: 1,
    fontWeight: '500',
  },
  objectiveTitleCompleted: {
    fontWeight: '600',
    color: Colors.onSurface,
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  recordStartButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recordStartText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  activeDockRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dockSecondaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dockSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  dockPrimaryBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary,
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
  dockPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  evaluatingCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  evaluatingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSurface,
    marginTop: 16,
  },
  evaluatingSubtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  evaluatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    marginTop: 16,
  },
  evaluatingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
});
