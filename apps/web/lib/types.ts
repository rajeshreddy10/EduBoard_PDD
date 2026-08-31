export type UserRole = 'student' | 'teacher' | 'school_admin' | 'super_admin';
export type ThemeMode = 'light' | 'dark' | 'system';
export type GestureMode = 'minimal' | 'advanced' | 'pro';
export type Platform = 'android' | 'windows' | 'web' | 'tablet' | 'smartboard';


export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  phone?: string;
  institution?: string;
  grade?: string;
  subject?: string;
  location?: string;
  website?: string;
  dob?: string;
  gender?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  languages?: string[];
  certifications?: string[];
  interests?: string[];
  isVerified: boolean;
  isBiometricEnabled: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupRequest {
  email: string;
  password: string;
  confirmPassword?: string;
  name: string;
  role: UserRole;
  institution?: string;
}

export interface OTPVerification {
  email: string;
  otp: string;
}

export interface Board {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isShared: boolean;
  sharedWith?: string[];
  content?: string;
  thumbnail?: string;
  bgColor?: string;
  width: number;
  height: number;
  zoom: number;
  isInfiniteCanvas: boolean;
  tags?: string[];
  folder?: string;
  strokes?: any[];
  elements?: any[];
  bgFile?: { url: string; type: string };
  activeDocument?: any;
}

export type HistoryRecord = Board;
export type HistoryItem = Board;

export interface DrawingStroke {
  points: { x: number; y: number; pressure?: number }[];
  color: string;
  width: number;
  opacity: number;
  tool: 'pen' | 'brush' | 'eraser' | 'area-eraser' | 'highlighter' | 'shape' | 'text' | 'marker' | 'select' | 'sticky' | 'laser' | 'image';
  shape?: 'circle' | 'rectangle' | 'triangle' | 'line' | 'arrow' | 'diamond' | 'star';
  timestamp: number;
  text?: string;
  font?: string;
  fontSize?: number;
  x?: number;
  y?: number;
  rotation?: number;
  isAiGenerated?: boolean;
  fillColor?: string;
  imageData?: string;
  imgWidth?: number;
  imgHeight?: number;
}

export interface GestureData {
  type: 'writing' | 'erase' | 'select' | 'undo' | 'clear' | 'zoom' | 'pan' | 'click' | 'drag' | 'swipe' | 'pinch' | 'rotate' | 'custom';
  confidence: number;
  position: { x: number; y: number };
  landmarks?: { x: number; y: number; z: number }[];
  timestamp: string;
  handedness: 'left' | 'right';
  fingers: { thumb: boolean; index: boolean; middle: boolean; ring: boolean; pinky: boolean };
  gestureName?: string;
}

export interface GestureMapping {
  id: string;
  gesture: string;
  action: string;
  isActive: boolean;
  sensitivity: number;
  shortcut?: string;
}

export interface VoiceCommand {
  id: string;
  command: string;
  action: string;
  language: string;
  isActive: boolean;
  feedback?: string;
}

export interface Classroom {
  id: string;
  code: string;
  name: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  subject?: string;
  grade?: string;
  students: ClassroomStudent[];
  isLive: boolean;
  startedAt?: string;
  endedAt?: string;
  recording?: boolean;
  maxStudents: number;
  settings: ClassroomSettings;
}

export interface ClassroomStudent {
  userId: string;
  name: string;
  avatar?: string;
  joinedAt: string;
  isPresent: boolean;
  handRaised: boolean;
  muted: boolean;
  attentionScore?: number;
}

export interface ClassroomSettings {
  allowChat: boolean;
  allowHandRaise: boolean;
  allowScreenShare: boolean;
  muteOnJoin: boolean;
  requireApproval: boolean;
  recordingEnabled: boolean;
  autoAttendance: boolean;
  language: string;
}

export interface Poll {
  id: string;
  classroomId: string;
  question: string;
  options: PollOption[];
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  isAnonymous: boolean;
  type: 'multiple' | 'single' | 'true_false' | 'rating' | 'open';
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  isCorrect?: boolean;
}

export interface PollVote {
  pollId: string;
  optionId: string;
  userId: string;
  votedAt: string;
}

export interface Quiz {
  id: string;
  classroomId: string;
  title: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  createdAt: string;
  isActive: boolean;
  shuffleQuestions: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  points: number;
  timeLimit?: number;
}

export interface Lecture {
  id: string;
  classroomId: string;
  title: string;
  subject?: string;
  teacherId: string;
  teacherName: string;
  startedAt: string;
  endedAt?: string;
  duration: number;
  recordingUrl?: string;
  transcriptUrl?: string;
  summary?: string;
  aiNotes?: string;
  slides?: string[];
  attendance: LectureAttendance[];
  tags?: string[];
}

export interface LectureAttendance {
  userId: string;
  name: string;
  timestamp: string;
  method: 'manual' | 'face' | 'qrcode' | 'auto';
  status: 'present' | 'late' | 'absent' | 'excused';
}

export interface AttendanceRecord {
  id: string;
  classroomId: string;
  lectureId: string;
  date: string;
  records: LectureAttendance[];
  totalStudents: number;
  presentCount: number;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    confidence?: number;
    sources?: string[];
    tokens?: number;
  };
}

export interface AISummary {
  id: string;
  lectureId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  actionItems: string[];
  questionsForReview: string[];
  generatedAt: string;
  modelVersion: string;
}

export interface AIInsight {
  id: string;
  userId: string;
  type: 'performance' | 'engagement' | 'recommendation' | 'alert' | 'trend';
  title: string;
  description: string;
  value: number;
  change: number;
  icon: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  actionable: boolean;
}

export interface CloudFile {
  id: string;
  name: string;
  type: 'board' | 'document' | 'recording' | 'image' | 'export' | 'other';
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  folderId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isStarred: boolean;
  isSynced: boolean;
  tags?: string[];
  sharedWith?: string[];
}

export interface UserSettings {
  theme: ThemeMode;
  language: string;
  country?: string;
  timeZone?: string;
  gestureMode: GestureMode;
  voiceAssistance: boolean;
  serverSTT: boolean;
  autoCorrect: boolean;
  spellCheck: boolean;
  textSize: 'small' | 'medium' | 'large';
  soundEnabled: boolean;
  hapticFeedback: boolean;
  gestureAccuracy: 'low' | 'medium' | 'high';
  autoSave: boolean;
  autoSync: boolean;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  smartSuggestions: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: number;
  boardWidth: number;
  boardHeight: number;
  defaultTool: string;
  defaultColor: string;
  defaultStrokeWidth: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username?: string;
  bio?: string;
  avatar?: string;
  phone?: string;
  role: UserRole;
  institution?: string;
  grade?: string;
  subject?: string;
  location?: string;
  website?: string;
  dob?: string;
  gender?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  languages?: string[];
  certifications?: string[];
  interests?: string[];
  joinDate: string;
  settings: UserSettings;
  stats: UsageStats;
  isVerified: boolean;
  createdAt: string;
}

export interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSchools: number;
  growth: number;
  usersByRole: Record<UserRole, number>;
  dailyActiveUsers: AnalyticsData[];
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    storageUsed: number;
    activeConnections: number;
  };
}

export interface CollaborationSession {
  id: string;
  boardId: string;
  hostId: string;
  hostName: string;
  participants: CollaborationParticipant[];
  startedAt: string;
  isActive: boolean;
  tool: string;
  cursors: Record<string, { x: number; y: number }>;
}

export interface CollaborationParticipant {
  userId: string;
  name: string;
  avatar?: string;
  color: string;
  joinedAt: string;
  isOnline: boolean;
  cursor?: { x: number; y: number };
}

export interface AR3DObject {
  id: string;
  name: string;
  category: 'science' | 'math' | 'geography' | 'history' | 'anatomy' | 'chemistry' | 'physics' | 'engineering';
  modelUrl: string;
  thumbnailUrl?: string;
  description?: string;
  isInteractive: boolean;
  scale: number;
  rotation: { x: number; y: number; z: number };
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

export interface SharedBoard {
  id: string;
  boardId: string;
  sharedWith: string[];
  permission: 'view' | 'edit' | 'admin';
}

export interface AnalyticsData {
  date: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  id: string;
  userId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  metrics: {
    boardsCreated: number;
    gesturesPerMinute: number;
    accuracy: number;
    writingSpeed: number;
    collaborationCount: number;
    classroomHours: number;
    attendanceRate: number;
    engagementScore: number;
    completionRate: number;
  };
  trends: AnalyticsData[];
  recommendations: string[];
  insights: AIInsight[];
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionable: boolean;
  actionUrl?: string;
  icon?: string;
  senderId?: string;
  senderName?: string;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  type: 'board_created' | 'board_edited' | 'board_shared' | 'board_deleted' | 'classroom_joined' | 'classroom_created' | 'lecture_recorded' | 'ai_summary' | 'export' | 'collaboration' | 'achievement' | 'login' | 'settings_change';
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
  icon?: string;
}

export interface CloudFile {
  id: string;
  name: string;
  type: 'board' | 'document' | 'recording' | 'image' | 'export' | 'other';
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  folderId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isStarred: boolean;
  isSynced: boolean;
  tags?: string[];
  sharedWith?: string[];
}

export interface Classroom {
  id: string;
  code: string;
  name: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  subject?: string;
  grade?: string;
  students: ClassroomStudent[];
  isLive: boolean;
  startedAt?: string;
  endedAt?: string;
  recording?: boolean;
  maxStudents: number;
  settings: ClassroomSettings;
}

export interface ClassroomStudent {
  userId: string;
  name: string;
  avatar?: string;
  joinedAt: string;
  isPresent: boolean;
  handRaised: boolean;
  muted: boolean;
  attentionScore?: number;
}

export interface ClassroomSettings {
  allowChat: boolean;
  allowHandRaise: boolean;
  allowScreenShare: boolean;
  muteOnJoin: boolean;
  requireApproval: boolean;
  recordingEnabled: boolean;
  autoAttendance: boolean;
  language: string;
}

export interface Poll {
  id: string;
  classroomId: string;
  question: string;
  options: PollOption[];
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  isAnonymous: boolean;
  type: 'multiple' | 'single' | 'true_false' | 'rating' | 'open';
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  isCorrect?: boolean;
}

export interface Quiz {
  id: string;
  classroomId: string;
  title: string;
  questions: QuizQuestion[];
  timeLimit?: number;
  createdAt: string;
  isActive: boolean;
  shuffleQuestions: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  points: number;
  timeLimit?: number;
}

export interface Lecture {
  id: string;
  classroomId: string;
  title: string;
  subject?: string;
  teacherId: string;
  teacherName: string;
  startedAt: string;
  endedAt?: string;
  duration: number;
  recordingUrl?: string;
  transcriptUrl?: string;
  summary?: string;
  aiNotes?: string;
  slides?: string[];
  attendance: LectureAttendance[];
  tags?: string[];
}

export interface LectureAttendance {
  userId: string;
  name: string;
  timestamp: string;
  method: 'manual' | 'face' | 'qrcode' | 'auto';
  status: 'present' | 'late' | 'absent' | 'excused';
}

export interface AttendanceRecord {
  id: string;
  classroomId: string;
  lectureId: string;
  date: string;
  records: LectureAttendance[];
  totalStudents: number;
  presentCount: number;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    confidence?: number;
    sources?: string[];
    tokens?: number;
  };
}

export interface AISummary {
  id: string;
  lectureId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  actionItems: string[];
  questionsForReview: string[];
  generatedAt: string;
  modelVersion: string;
}

export interface AIInsight {
  id: string;
  userId: string;
  type: 'performance' | 'engagement' | 'recommendation' | 'alert' | 'trend';
  title: string;
  description: string;
  value: number;
  change: number;
  icon: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  actionable: boolean;
}

export interface UsageStats {
  totalBoards: number;
  totalGestures: number;
  totalWriteTime: number;
  averageAccuracy: number;
  mostUsedGesture: string;
  mostUsedTool: string;
  totalClassrooms: number;
  totalLectures: number;
  totalStudents: number;
  totalCollaborations: number;
  storageUsed: number;
  lastUsed: string;
}

export interface BoardActivity {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
}
