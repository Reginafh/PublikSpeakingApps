import { apiRequest } from './api';

export interface BackendHistoryItem {
  history_id: string;
  user_id: string;
  filename: string;
  source_type: 'upload' | 'recording';
  event_context: 'formal' | 'business' | 'non_formal' | 'keynote';
  duration_seconds: number;
  annotated_transcript: string;
  speech_review: string;
  created_at: string | { _seconds?: number };
}

export interface StoreEvent {
  event_id: string;
  title: string;
  description: string;
  discount_percent: number;
}

export interface HomeSummaryResponse {
  status: string;
  tokens: number;
  recent_history: BackendHistoryItem[];
  store_events: StoreEvent[];
}

export interface ParsedSpeechMetrics {
  score: number;
  wpm: number;
  fillerCount: number;
  fillerPct: number;
  clarityPct: number;
  dailyTipTitle: string;
  dailyTipBody: string;
  formattedDate: string;
  formattedDuration: string;
}

/**
 * Parses Gemini's structured Markdown review & transcript into dashboard metrics
 */
export function parseSpeechMetrics(item: BackendHistoryItem): ParsedSpeechMetrics {
  const review = item.speech_review || '';
  const transcript = item.annotated_transcript || '';

  // 1. Extract Overall Score (e.g., "85/100" or "Skor Keseluruhan: 85")
  const scoreMatch =
    review.match(/(\d{1,3})\s*\/\s*100/) ||
    review.match(/Skor[^0-9]{0,25}(\d{1,3})/i);
  const score = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 80;

  // 2. Calculate WPM from transcript word count & audio duration
  const cleanWords = transcript
    .replace(/[\\^~!?-]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const wordCount = Math.max(cleanWords.length, 1);
  const minutes = Math.max((item.duration_seconds || 30) / 60, 0.1);
  const wpm = Math.round(wordCount / minutes);

  // 3. Count common Indonesian & English filler words in the verbatim transcript
  const fillerMatches = transcript.match(/\b(eee+|emm+|eh+|anu|kayak|um+|uh+|like|you know)\b/gi);
  const fillerCount = fillerMatches ? fillerMatches.length : 0;
  const fillerPct = Number(((fillerCount / wordCount) * 100).toFixed(1));

  // 4. Estimate vocal clarity based on hesitation (~) and monotone (-) annotations
  const hesitationMarks = (transcript.match(/[~-]/g) || []).length;
  const clarityPct = Math.max(60, Math.min(99, 96 - hesitationMarks * 2));

  // 5. Extract Improvement Tip from Section 4 ("Saran Perbaikan" / "Kelebihan & Saran")
  const tipSectionMatch = review.match(/(?:Saran Perbaikan|Kelebihan & Saran)[^\n]*\n([\s\S]{20,350})/i);
  let dailyTipBody =
    'Pertahankan tempo bicara yang stabil dan gunakan jeda singkat sebagai pengganti kata pengisi seperti "emm" atau "anu".';
  if (tipSectionMatch && tipSectionMatch[1]) {
    dailyTipBody = tipSectionMatch[1]
      .replace(/[*#_`]/g, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(' ');
  }

  // 6. Format duration (e.g., 192s -> "3m 12s")
  const totalSecs = Math.round(item.duration_seconds || 0);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const formattedDuration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  // 7. Format date
  let formattedDate = 'Recent';
  if (typeof item.created_at === 'string') {
    const d = new Date(item.created_at);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } else if (item.created_at && typeof item.created_at === 'object' && item.created_at._seconds) {
    const d = new Date(item.created_at._seconds * 1000);
    formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const contextLabels: Record<string, string> = {
    formal: 'Formal Delivery Focus',
    business: 'Persuasion & Clarity Focus',
    non_formal: 'Natural Storytelling Focus',
    keynote: 'Stage Dynamics Focus',
  };

  return {
    score,
    wpm,
    fillerCount,
    fillerPct,
    clarityPct,
    dailyTipTitle: contextLabels[item.event_context] || 'Gemini Speech Coaching',
    dailyTipBody,
    formattedDate,
    formattedDuration,
  };
}

export const HomeService = {
  async getSummary(userId: string): Promise<HomeSummaryResponse> {
    return apiRequest<HomeSummaryResponse>(`/api/home/summary/${userId}`);
  },

  async getAllHistory(userId: string): Promise<{ status: string; total: number; data: BackendHistoryItem[] }> {
    return apiRequest(`/api/history/all/${userId}`);
  },

  async buyTokens(userId: string, packageId: 'pkg_10' | 'pkg_50' | 'pkg_100') {
    return apiRequest<{ status: string; message: string; new_token_balance: number }>(
      '/api/store/buy',
      {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, package_id: packageId }),
      }
    );
  },
};