import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FillerWordOccurrence {
  word: string;
  timestamp: string;
}

export interface MetricDimension {
  score: number;
  comment: string;
}

export interface KeyStrength {
  title: string;
  description: string;
}

export interface AISuggestion {
  category: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'impact' | 'fluency' | 'pacing' | 'structure';
}

export interface SpeechEvaluation {
  id: string;
  title: string;
  scenario: string;
  date: string;
  durationSeconds: number;
  durationDisplay: string;
  wpm: number;
  clarityScore: number;
  fillerWordsCount: number;
  fillerWords: FillerWordOccurrence[];
  overallScore: number;
  gradeClassification: string;
  percentileText: string;
  audioUri?: string;
  transcript: string;
  telemetryBreakdown: {
    mainPointClarity: MetricDimension;
    structureAndFlow: MetricDimension;
    pacingAndTone: MetricDimension;
    vocabularyAndFillers: MetricDimension;
  };
  keyStrengths: KeyStrength[];
  aiSuggestions: AISuggestion[];
  targetObjectives: { title: string; completed: boolean }[];
}

export interface UserProfile {
  name: string;
  email: string;
  streakDays: number;
  overallScore: number;
  averagePace: number;
  averageFillersPct: number;
  averageClarityPct: number;
}

const STORAGE_KEYS = {
  SPEECHES: 'speakup_speeches_v1',
  PROFILE: 'speakup_profile_v1',
  GEMINI_API_KEY: 'speakup_gemini_api_key',
};

// Seed initial speeches from design specs
const INITIAL_SPEECHES: SpeechEvaluation[] = [
  {
    id: 'speech-1',
    title: 'Project Proposal',
    scenario: 'Elevator Pitch',
    date: 'Today, 10:24 AM',
    durationSeconds: 192,
    durationDisplay: '3m 12s',
    wpm: 142,
    clarityScore: 92,
    fillerWordsCount: 2,
    fillerWords: [
      { word: 'um', timestamp: '00:32' },
      { word: 'uh', timestamp: '01:05' },
    ],
    overallScore: 88,
    gradeClassification: 'Proficient Speaker',
    percentileText: 'Top 12%',
    transcript:
      "Good morning team. Today I am proposing our next-generation speech evaluation platform SpeakUp. By integrating real-time telemetry and Gemini AI diagnostics, we can help millions overcome stage fright. Um, our data shows a 40% increase in confidence after just 5 sessions. Uh, with your approval, we launch phase 1 next month.",
    telemetryBreakdown: {
      mainPointClarity: {
        score: 92,
        comment: 'Core thesis introduced within first 15 seconds.',
      },
      structureAndFlow: {
        score: 85,
        comment: 'Strong problem-solution sequence; slight dip in closing.',
      },
      pacingAndTone: {
        score: 88,
        comment: 'Consistent cadence with authoritative pitch modulation.',
      },
      vocabularyAndFillers: {
        score: 80,
        comment: 'Logged: 1x "um", 1x "uh". Very clean delivery overall.',
      },
    },
    keyStrengths: [
      {
        title: 'Compelling opening hook',
        description: 'Captured listener attention with concrete problem statement immediately.',
      },
      {
        title: 'Crisp value proposition',
        description: 'Articulated ROI and user benefits with zero linguistic hesitation.',
      },
    ],
    aiSuggestions: [
      {
        type: 'impact',
        category: 'Impact Amplification',
        title: 'Expand on ROI metrics in the second half',
        description: 'Back your growth statement with user retention rates and 3-year margin milestones.',
        timestamp: '01:42',
      },
      {
        type: 'fluency',
        category: 'Fluency Adjustment',
        title: 'Pause 1s before transitions instead of saying "um"',
        description: 'Silence conveys confidence, not hesitation. Breathe before changing slides.',
        timestamp: '00:32',
      },
    ],
    targetObjectives: [
      { title: 'Hook audience in first 15s', completed: true },
      { title: 'Articulate core problem and solution', completed: true },
      { title: 'Call to action closing', completed: false },
    ],
  },
  {
    id: 'speech-2',
    title: 'Impression Speech',
    scenario: 'Job Interview',
    date: 'Yesterday, 3:15 PM',
    durationSeconds: 345,
    durationDisplay: '5m 45s',
    wpm: 128,
    clarityScore: 86,
    fillerWordsCount: 4,
    fillerWords: [
      { word: 'like', timestamp: '01:12' },
      { word: 'you know', timestamp: '02:04' },
      { word: 'um', timestamp: '03:10' },
      { word: 'like', timestamp: '04:30' },
    ],
    overallScore: 76,
    gradeClassification: 'Competent Speaker',
    percentileText: 'Top 35%',
    transcript:
      "When tackling system design challenges, I prioritize scalability and simplicity. Like, in my previous role, you know, we had bottlenecks during peak traffic. Um, I re-architected the message bus, reducing latency by 60%.",
    telemetryBreakdown: {
      mainPointClarity: {
        score: 82,
        comment: 'Answers technical question directly with relevant examples.',
      },
      structureAndFlow: {
        score: 75,
        comment: 'STAR method applied well, but concluding result was hurried.',
      },
      pacingAndTone: {
        score: 78,
        comment: 'Calm tone, slightly slow pace during technical explanation.',
      },
      vocabularyAndFillers: {
        score: 70,
        comment: '4 filler words detected ("like", "you know", "um").',
      },
    },
    keyStrengths: [
      {
        title: 'Concrete technical examples',
        description: 'Demonstrated real-world experience with specific architectural tradeoffs.',
      },
      {
        title: 'Empathetic teamwork framing',
        description: 'Credited team collaborators when describing past achievements.',
      },
    ],
    aiSuggestions: [
      {
        type: 'fluency',
        category: 'Filler Word Reduction',
        title: 'Eliminate conversational fillers ("like", "you know")',
        description: 'In formal job interviews, conversational colloquialisms lower perceived authority.',
        timestamp: '01:12',
      },
      {
        type: 'structure',
        category: 'Structure Enhancement',
        title: 'Dedicate 30 seconds to measurable business impact',
        description: 'Conclude answers by stating the bottom-line value delivered to the organization.',
        timestamp: '04:15',
      },
    ],
    targetObjectives: [
      { title: 'Clear STAR structure (Situation, Task, Action, Result)', completed: true },
      { title: 'Quantifiable metrics mentioned', completed: true },
      { title: 'No filler words during summary', completed: false },
    ],
  },
];

const INITIAL_PROFILE: UserProfile = {
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  streakDays: 5,
  overallScore: 84,
  averagePace: 142,
  averageFillersPct: 1.2,
  averageClarityPct: 92,
};

export const SpeechStorage = {
  async getSpeeches(): Promise<SpeechEvaluation[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SPEECHES);
      if (data) {
        return JSON.parse(data);
      }
      // Initialize with demo data
      await AsyncStorage.setItem(STORAGE_KEYS.SPEECHES, JSON.stringify(INITIAL_SPEECHES));
      return INITIAL_SPEECHES;
    } catch {
      return INITIAL_SPEECHES;
    }
  },

  async getSpeechById(id: string): Promise<SpeechEvaluation | null> {
    const list = await this.getSpeeches();
    return list.find((s) => s.id === id) || null;
  },

  async saveSpeech(speech: SpeechEvaluation): Promise<void> {
    try {
      const list = await this.getSpeeches();
      const existingIndex = list.findIndex((s) => s.id === speech.id);
      let updated: SpeechEvaluation[];
      if (existingIndex >= 0) {
        updated = [...list];
        updated[existingIndex] = speech;
      } else {
        updated = [speech, ...list];
      }
      await AsyncStorage.setItem(STORAGE_KEYS.SPEECHES, JSON.stringify(updated));

      // Recalculate overall score & profile averages
      const scores = updated.map((s) => s.overallScore);
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const profile = await this.getProfile();
      await this.saveProfile({
        ...profile,
        overallScore: avgScore,
      });
    } catch (e) {
      console.error('Failed to save speech:', e);
    }
  },

  async deleteSpeech(id: string): Promise<void> {
    try {
      const list = await this.getSpeeches();
      const filtered = list.filter((s) => s.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.SPEECHES, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete speech:', e);
    }
  },

  async getProfile(): Promise<UserProfile> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(INITIAL_PROFILE));
      return INITIAL_PROFILE;
    } catch {
      return INITIAL_PROFILE;
    }
  },

  async saveProfile(profile: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  },

  async getApiKey(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY);
    } catch {
      return null;
    }
  },

  async saveApiKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, key.trim());
    } catch (e) {
      console.error('Failed to save API key:', e);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SPEECHES);
      await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE);
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  },
};
