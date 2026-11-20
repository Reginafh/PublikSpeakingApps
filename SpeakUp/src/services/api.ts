import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your PC's local IPv4 address when testing on a physical device
export const API_BASE_URL = 'http://192.168.1.10:8000';

const AUTH_STORAGE_KEY = '@speakup_auth_session';

export interface AuthSession {
  userId: string;
  email: string;
  token: string;
  idToken?: string;
  refreshToken?: string;
}

/*
  Decodes a JWT payload without external dependencies to extract the Firebase UID
 */
export function extractUidFromJwt(jwtToken: string): string {
  try {
    const base64Url = jwtToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    // Custom tokens store UID in 'uid'; Firebase idTokens store it in 'user_id' or 'sub'
    return decoded.uid || decoded.user_id || decoded.sub || '';
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return '';
  }
}

export const AuthStorage = {
  async saveSession(session: AuthSession) {
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  },
  async getSession(): Promise<AuthSession | null> {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  async clearSession() {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  },
};

/*
  Helper for JSON API calls with FastAPI error extraction
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    // FastAPI returns errors in `detail` (can be a string or validation array)
    let errorMessage = 'Terjadi kesalahan pada server.';
    if (typeof data.detail === 'string') {
      errorMessage = data.detail;
    } else if (Array.isArray(data.detail) && data.detail[0]?.msg) {
      errorMessage = data.detail[0].msg;
    }
    throw new Error(errorMessage);
  }

  return data as T;
}