'use client';

export interface GesturePattern {
  id: string;
  gestureType: string;
  landmarks: number[];
  confidence: number;
  timestamp: number;
  userId: string;
  duration: number;
  handedness: string;
}

export interface GestureProfile {
  userId: string;
  patterns: GesturePattern[];
  accuracy: number;
  totalLearned: number;
  lastCalibrated: number;
  sensitivity: number;
  gestureStats: Record<string, {
    count: number;
    avgConfidence: number;
    accuracyHistory: number[];
  }>;
}

const STORAGE_KEY = 'eduboard-gesture-profiles';
const PATTERNS_KEY = 'eduboard-gesture-patterns';

function getProfiles(): Record<string, GestureProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProfiles(profiles: Record<string, GestureProfile>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {}
}

function getPatterns(): GesturePattern[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PATTERNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePatterns(patterns: GesturePattern[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
  } catch {}
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

const DEFAULT_SENSITIVITY = 70;
const ADAPTIVE_LEARNING_RATE = 0.15;
const HISTORY_WINDOW = 50;

function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function normalizeLandmarks(landmarks: number[]): number[] {
  if (landmarks.length < 3) return landmarks;
  const centerX = landmarks[0];
  const centerY = landmarks[1];
  const normalized: number[] = [];
  for (let i = 0; i < landmarks.length; i += 3) {
    normalized.push(landmarks[i] - centerX);
    normalized.push(landmarks[i + 1] - centerY);
    normalized.push(landmarks[i + 2] || 0);
  }
  return normalized;
}

class GestureLearner {
  private profiles: Record<string, GestureProfile>;
  private patterns: GesturePattern[];
  private currentUserId: string;

  constructor() {
    this.profiles = {};
    this.patterns = [];
    this.currentUserId = 'default';
    this.load();
  }

  private load() {
    this.profiles = getProfiles();
    this.patterns = getPatterns();
    if (!this.profiles[this.currentUserId]) {
      this.profiles[this.currentUserId] = this.createDefaultProfile();
      saveProfiles(this.profiles);
    }
  }

  private createDefaultProfile(): GestureProfile {
    return {
      userId: this.currentUserId,
      patterns: [],
      accuracy: 0,
      totalLearned: 0,
      lastCalibrated: 0,
      sensitivity: DEFAULT_SENSITIVITY,
      gestureStats: {},
    };
  }

  setUser(userId: string) {
    this.currentUserId = userId;
    if (!this.profiles[userId]) {
      this.profiles[userId] = {
        ...this.createDefaultProfile(),
        userId,
      };
      saveProfiles(this.profiles);
    }
  }

  getProfile(userId?: string): GestureProfile {
    const uid = userId || this.currentUserId;
    if (!this.profiles[uid]) {
      this.profiles[uid] = {
        ...this.createDefaultProfile(),
        userId: uid,
      };
      saveProfiles(this.profiles);
    }
    return this.profiles[uid];
  }

  learn(pattern: Omit<GesturePattern, 'id' | 'timestamp'>): GesturePattern {
    const full: GesturePattern = {
      ...pattern,
      id: generateId(),
      timestamp: Date.now(),
    };

    this.patterns.push(full);
    if (this.patterns.length > HISTORY_WINDOW * 10) {
      this.patterns = this.patterns.slice(-HISTORY_WINDOW * 10);
    }
    savePatterns(this.patterns);

    const profile = this.getProfile(pattern.userId);
    profile.patterns.push(full);
    if (profile.patterns.length > HISTORY_WINDOW) {
      profile.patterns = profile.patterns.slice(-HISTORY_WINDOW);
    }
    profile.totalLearned++;

    if (!profile.gestureStats[pattern.gestureType]) {
      profile.gestureStats[pattern.gestureType] = {
        count: 0,
        avgConfidence: 0,
        accuracyHistory: [],
      };
    }

    const stats = profile.gestureStats[pattern.gestureType];
    stats.count++;
    stats.avgConfidence = (stats.avgConfidence * (stats.count - 1) + pattern.confidence) / stats.count;
    stats.accuracyHistory.push(pattern.confidence);
    if (stats.accuracyHistory.length > HISTORY_WINDOW) {
      stats.accuracyHistory = stats.accuracyHistory.slice(-HISTORY_WINDOW);
    }

    profile.accuracy = this.computeOverallAccuracy(profile);
    saveProfiles(this.profiles);

    return full;
  }

  predict(landmarks: number[]): { gesture: string; confidence: number; suggestions: string[] } {
    const profile = this.getProfile();
    if (profile.patterns.length === 0) {
      return { gesture: 'unknown', confidence: 0, suggestions: ['No training data available. Perform some gestures first.'] };
    }

    const normalized = normalizeLandmarks(landmarks);
    let bestMatch = 'unknown';
    let bestConfidence = 0;
    const gestureScores: Record<string, number[]> = {};

    for (const p of profile.patterns) {
      if (p.landmarks.length !== landmarks.length) continue;
      const pNorm = normalizeLandmarks(p.landmarks);
      const dist = euclideanDistance(normalized, pNorm);
      const similarity = Math.max(0, 1 - dist / 1000);
      const weightedScore = similarity * p.confidence;

      if (!gestureScores[p.gestureType]) {
        gestureScores[p.gestureType] = [];
      }
      gestureScores[p.gestureType].push(weightedScore);
    }

    const adaptiveThreshold = Math.max(0.3, profile.accuracy * 0.6);

    for (const [gesture, scores] of Object.entries(gestureScores)) {
      if (scores.length === 0) continue;
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore > bestConfidence) {
        bestConfidence = avgScore;
        bestMatch = gesture;
      }
    }

    const suggestions: string[] = [];
    if (bestConfidence < adaptiveThreshold) {
      suggestions.push('Try performing the gesture more deliberately.');
      suggestions.push('Ensure your hand is fully visible to the camera.');
      if (profile.sensitivity < 50) {
        suggestions.push('Consider increasing sensitivity for better detection.');
      }
    } else if (bestConfidence < 0.6) {
      suggestions.push('Good attempt! Try slowing down the gesture.');
    }

    if (bestConfidence >= 0.3 && bestMatch !== 'unknown') {
      suggestions.push('Gesture recognized. Repeat to improve accuracy.');
    }

    return {
      gesture: bestConfidence >= adaptiveThreshold ? bestMatch : 'unknown',
      confidence: Math.round(bestConfidence * 100) / 100,
      suggestions,
    };
  }

  getAccuracy(userId?: string): number {
    const profile = this.getProfile(userId);
    return Math.round(profile.accuracy * 100) / 100;
  }

  private computeOverallAccuracy(profile: GestureProfile): number {
    if (profile.patterns.length === 0) return 0;
    const total = profile.patterns.reduce((sum, p) => sum + p.confidence, 0);
    return total / profile.patterns.length;
  }

  getSuggestion(gesture: string): string[] {
    const profile = this.getProfile();
    const stats = profile.gestureStats[gesture];
    const suggestions: string[] = [];

    if (!stats || stats.count === 0) {
      suggestions.push(`No data for "${gesture}". Try performing it a few times to calibrate.`);
      suggestions.push('Ensure consistent hand positioning.');
      return suggestions;
    }

    if (stats.avgConfidence < 0.5) {
      suggestions.push('Low confidence detected. Try these improvements:');
      suggestions.push('- Keep your hand steady and centered');
      suggestions.push('- Perform the gesture slowly and deliberately');
      suggestions.push('- Ensure good lighting conditions');
      if (profile.sensitivity > 80) {
        suggestions.push('- Consider lowering sensitivity to reduce false positives');
      }
    } else if (stats.avgConfidence < 0.75) {
      suggestions.push('Moderate confidence. To improve:');
      suggestions.push('- Maintain consistent distance from camera');
      suggestions.push('- Use the same hand orientation each time');
    } else {
      suggestions.push('Great accuracy! To maintain:');
      suggestions.push('- Continue practicing regularly');
      suggestions.push('- Your muscle memory is developing well');
    }

    return suggestions;
  }

  calibrate(sensitivity: number): void {
    const clamped = Math.max(10, Math.min(100, sensitivity));
    const profile = this.getProfile();
    profile.sensitivity = clamped;
    profile.lastCalibrated = Date.now();
    saveProfiles(this.profiles);
  }

  getStats(userId?: string): {
    totalLearned: number;
    avgConfidence: number;
    streakDays: number;
    lastCalibrated: number;
    sensitivity: number;
    perGesture: Record<string, { count: number; avgConfidence: number }>;
  } {
    const profile = this.getProfile(userId);
    const allPatterns = profile.patterns;
    const avgConf = allPatterns.length > 0
      ? allPatterns.reduce((s, p) => s + p.confidence, 0) / allPatterns.length
      : 0;

    const dates = allPatterns.map(p => new Date(p.timestamp).toDateString());
    const uniqueDates = [...new Set(dates)].sort();
    let streak = 0;
    const today = new Date().toDateString();
    for (let i = uniqueDates.length - 1; i >= 0; i--) {
      const expected = new Date();
      expected.setDate(expected.getDate() - (uniqueDates.length - 1 - i));
      if (uniqueDates[i] === expected.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    const perGesture: Record<string, { count: number; avgConfidence: number }> = {};
    for (const [gesture, stats] of Object.entries(profile.gestureStats)) {
      perGesture[gesture] = {
        count: stats.count,
        avgConfidence: Math.round(stats.avgConfidence * 100) / 100,
      };
    }

    return {
      totalLearned: profile.totalLearned,
      avgConfidence: Math.round(avgConf * 100) / 100,
      streakDays: streak,
      lastCalibrated: profile.lastCalibrated,
      sensitivity: profile.sensitivity,
      perGesture,
    };
  }

  getCorrectionHistory(userId?: string): GesturePattern[] {
    const profile = this.getProfile(userId);
    return [...profile.patterns].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  }

  getAllProfiles(): GestureProfile[] {
    return Object.values(this.profiles);
  }

  resetUser(userId: string): void {
    this.profiles[userId] = {
      ...this.createDefaultProfile(),
      userId,
    };
    saveProfiles(this.profiles);
  }

  resetAll(): void {
    this.patterns = [];
    this.profiles = {};
    savePatterns([]);
    saveProfiles({});
    this.load();
  }

  getTensorFlowPath(): string {
    return 'TensorFlow.js integration available. Install @tensorflow/tfjs and @tensorflow-models/handpose for real ML-powered hand tracking.';
  }
}

export const gestureLearner = new GestureLearner();
