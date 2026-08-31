import { Board, User, UserSettings, UserProfile, UsageStats, ActivityEntry, Notification, CollaborationSession, CollaborationParticipant, CloudFile, Lecture, AttendanceRecord, AISummary, AIInsight, Poll, Quiz, Classroom, DrawingStroke, GestureMapping, VoiceCommand, AdminMetrics, PerformanceReport, AR3DObject } from './types';

const KEYS = {
  user: 'sbb_user',
  boards: 'sbb_boards',
  settings: 'sbb_settings',
  notifications: 'sbb_notifications',
  activities: 'sbb_activities',
  drawings: 'sbb_drawings',
  classrooms: 'sbb_classrooms',
  lectures: 'sbb_lectures',
  attendance: 'sbb_attendance',
  polls: 'sbb_polls',
  quizzes: 'sbb_quizzes',
  aiSummaries: 'sbb_ai_summaries',
  aiInsights: 'sbb_ai_insights',
  cloudFiles: 'sbb_cloud_files',
  collaborations: 'sbb_collaborations',
  gestureMappings: 'sbb_gesture_mappings',
  voiceCommands: 'sbb_voice_commands',
  analytics: 'sbb_analytics',
  performanceReports: 'sbb_performance',
  chatHistory: 'sbb_chat_history',
  starredItems: 'sbb_starred',
  logo: 'sbb_logo',
  appName: 'sbb_app_name',
};

function get<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function set(key: string, value: any) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function genId(): string { return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }

const DEFAULT_USER: User = {
  id: 'guest', email: '', name: '', role: 'student',
  username: '', avatar: '', isVerified: false, isBiometricEnabled: false,
  createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString(),
  subject: '', institution: '',
  location: '', website: '', dob: '', gender: '',
  socialLinks: {},
  languages: ['English'], certifications: [], interests: [],
};

export function getUser(): User { return get(KEYS.user, DEFAULT_USER); }
export function setUser(u: User) { set(KEYS.user, u); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('profile-changed')); }
export function getProfile() {
  const u = getUser();
  return {
    fullName: u.name,
    email: u.email,
    institution: u.institution || '',
    dateOfBirth: u.dob || '',
    gender: u.gender || '',
    avatarUrl: u.avatar || null,
    bio: (u as any).bio || '',
  };
}
export function updateProfile(data: Partial<{ fullName: string; email: string; institution: string; dateOfBirth: string; gender: string; avatarUrl?: string; bio?: string }>) {
  const u = getUser();
  const updated = {
    ...u,
    ...(data.fullName ? { name: data.fullName } : {}),
    ...(data.email ? { email: data.email } : {}),
    ...(data.institution ? { institution: data.institution } : {}),
    ...(data.dateOfBirth ? { dob: data.dateOfBirth } : {}),
    ...(data.gender ? { gender: data.gender } : {}),
    ...(data.avatarUrl !== undefined ? { avatar: data.avatarUrl } : {}),
    ...(data.bio ? { bio: data.bio } : {}),
  };
  setUser(updated);
  return getProfile();
}
export function isLoggedIn(): boolean { return !!get(KEYS.user, null); }

export function login(email: string, _password: string): User {
  const u = { ...DEFAULT_USER, email, name: email.split('@')[0], lastLoginAt: new Date().toISOString() };
  set(KEYS.user, u); return u;
}

export function signup(name: string, email: string, role: string): User {
  const u = { ...DEFAULT_USER, id: genId(), name, email, role: role as any, createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString() };
  set(KEYS.user, u); return u;
}

export function logout() {
  localStorage.removeItem(KEYS.user);
  localStorage.removeItem('auth_token');
}

const SEED_BOARDS: Board[] = [
  { id: 'b1', title: 'Q3 Architecture Plan', description: 'System architecture design for the new platform', createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-07T02:15:00Z', createdBy: 'u1', isShared: true, sharedWith: ['jane@co.com'], width: 1920, height: 1080, zoom: 100, isInfiniteCanvas: true },
  { id: 'b2', title: 'Gesture UI Specs', description: 'Gesture interface specifications and wireframes', createdAt: '2025-05-02T09:00:00Z', updatedAt: '2025-05-07T00:30:00Z', createdBy: 'u1', isShared: false, width: 1920, height: 1080, zoom: 100, isInfiniteCanvas: false },
  { id: 'b3', title: 'Physics Lesson - Laws of Motion', description: 'Interactive physics lesson with diagrams', createdAt: '2025-04-28T14:00:00Z', updatedAt: '2025-05-06T10:00:00Z', createdBy: 'u1', isShared: true, sharedWith: ['students@class.com'], width: 3840, height: 2160, zoom: 75, isInfiniteCanvas: true },
  { id: 'b4', title: 'Math - Calculus Basics', description: 'Introduction to derivatives and integrals', createdAt: '2025-04-25T08:00:00Z', updatedAt: '2025-05-05T16:00:00Z', createdBy: 'u1', isShared: false, width: 1920, height: 1080, zoom: 100, isInfiniteCanvas: false },
  { id: 'b5', title: 'Chemistry - Periodic Table', description: 'Interactive periodic table study guide', createdAt: '2025-04-20T11:00:00Z', updatedAt: '2025-05-04T12:00:00Z', createdBy: 'u1', isShared: true, width: 2560, height: 1440, zoom: 80, isInfiniteCanvas: true },
];

export function getBoards(): Board[] { return get(KEYS.boards, SEED_BOARDS); }
export function getBoard(id: string): Board | undefined { return getBoards().find(b => b.id === id); }

export function createBoard(data: Partial<Board>): Board {
  const boards = getBoards();
  const b: Board = {
    id: genId(), title: data.title || 'Untitled Board', description: data.description || '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    createdBy: 'u1', isShared: false, width: 1920, height: 1080, zoom: 100, isInfiniteCanvas: true,
    ...data
  };
  boards.unshift(b); set(KEYS.boards, boards); return b;
}

export function updateBoard(id: string, data: Partial<Board>): Board | undefined {
  const boards = getBoards(); const idx = boards.findIndex(b => b.id === id);
  if (idx === -1) return undefined;
  boards[idx] = { ...boards[idx], ...data, updatedAt: new Date().toISOString() };
  set(KEYS.boards, boards); return boards[idx];
}

export function deleteBoard(id: string) { set(KEYS.boards, getBoards().filter(b => b.id !== id)); }

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light', language: 'en', gestureMode: 'advanced', voiceAssistance: true, serverSTT: true,
  autoCorrect: true, spellCheck: true, textSize: 'medium', soundEnabled: true,
  hapticFeedback: true, gestureAccuracy: 'high', autoSave: true, autoSync: true,
  notificationsEnabled: true, emailNotifications: false, smartSuggestions: true,
  reducedMotion: false, highContrast: false, fontSize: 16, boardWidth: 1920,
  boardHeight: 1080, defaultTool: 'pen', defaultColor: '#6366f1', defaultStrokeWidth: 3,
};

export function getSettings(): UserSettings { return get(KEYS.settings, DEFAULT_SETTINGS); }
export function updateSettings(s: Partial<UserSettings>): UserSettings {
  const updated = { ...getSettings(), ...s }; set(KEYS.settings, updated); return updated;
}

export function getUsageStats(): UsageStats {
  const boards = getBoards();
  return get(KEYS.analytics, {
    totalBoards: boards.length, totalGestures: 2847, totalWriteTime: 3912,
    averageAccuracy: 94.2, mostUsedGesture: 'writing', mostUsedTool: 'pen',
    totalClassrooms: 12, totalLectures: 48, totalStudents: 156,
    totalCollaborations: 89, storageUsed: 2.4, lastUsed: new Date().toISOString(),
  });
}

export function getDrawings(boardId: string): DrawingStroke[] {
  const all = get<Record<string, DrawingStroke[]>>(KEYS.drawings, {}); return all[boardId] || [];
}

export function saveDrawings(boardId: string, strokes: DrawingStroke[]) {
  const all = get<Record<string, DrawingStroke[]>>(KEYS.drawings, {}); all[boardId] = strokes; set(KEYS.drawings, all);
}

export function addStroke(boardId: string, stroke: DrawingStroke) {
  const strokes = getDrawings(boardId); strokes.push(stroke); saveDrawings(boardId, strokes);
}

export function clearDrawings(boardId: string) { saveDrawings(boardId, []); }

export function getClassrooms(): Classroom[] { return get(KEYS.classrooms, []); }
export function getClassroom(id: string): Classroom | undefined { return getClassrooms().find(c => c.id === id); }
export function createClassroom(data: Partial<Classroom>): Classroom {
  const rooms = getClassrooms();
  const c: Classroom = {
    id: genId(), code: Math.random().toString(36).substr(2, 6).toUpperCase(),
    name: data.name || 'New Classroom', teacherId: 'u1', teacherName: 'Rajesh Kumar',
    students: [], isLive: false, maxStudents: 50, settings: {
      allowChat: true, allowHandRaise: true, allowScreenShare: true,
      muteOnJoin: true, requireApproval: false, recordingEnabled: true,
      autoAttendance: true, language: 'en',
    }, ...data
  };
  rooms.push(c); set(KEYS.classrooms, rooms); return c;
}

export function getNotifications(): Notification[] { return get(KEYS.notifications, []); }
export function addNotification(n: Partial<Notification>): Notification {
  const notifications = getNotifications();
  const notif: Notification = {
    id: genId(), type: 'info', title: '', message: '', timestamp: new Date().toISOString(),
    read: false, actionable: false, ...n
  };
  notifications.unshift(notif); set(KEYS.notifications, notifications); return notif;
}
export function markNotificationRead(id: string) {
  const notifications = getNotifications();
  const n = notifications.find(x => x.id === id); if (n) { n.read = true; set(KEYS.notifications, notifications); }
}
export function markAllNotificationsRead() {
  getNotifications().forEach(n => n.read = true); set(KEYS.notifications, getNotifications());
}

export function getActivities(): ActivityEntry[] { return get(KEYS.activities, []); }
export function addActivity(data: Partial<ActivityEntry>): ActivityEntry {
  const activities = getActivities();
  const a: ActivityEntry = { id: genId(), userId: 'u1', type: 'board_created', description: '', timestamp: new Date().toISOString(), ...data };
  activities.unshift(a); if (activities.length > 100) activities.pop(); set(KEYS.activities, activities); return a;
}

export function getGestureMappings(): GestureMapping[] {
  return get(KEYS.gestureMappings, [
    { id: 'g1', gesture: 'index_point', action: 'draw', isActive: true, sensitivity: 75 },
    { id: 'g2', gesture: 'two_fingers', action: 'pan', isActive: true, sensitivity: 70 },
    { id: 'g3', gesture: 'fist', action: 'erase', isActive: true, sensitivity: 80 },
    { id: 'g4', gesture: 'open_palm', action: 'clear', isActive: true, sensitivity: 85 },
    { id: 'g5', gesture: 'pinch', action: 'zoom', isActive: true, sensitivity: 65 },
    { id: 'g6', gesture: 'swipe_left', action: 'undo', isActive: true, sensitivity: 60 },
    { id: 'g7', gesture: 'swipe_right', action: 'redo', isActive: true, sensitivity: 60 },
    { id: 'g8', gesture: 'ok_sign', action: 'select', isActive: true, sensitivity: 90 },
    { id: 'g9', gesture: 'thumbs_up', action: 'confirm', isActive: false, sensitivity: 50 },
    { id: 'g10', gesture: 'peace', action: 'tool_menu', isActive: false, sensitivity: 50 },
  ]);
}
export function updateGestureMapping(id: string, data: Partial<GestureMapping>): GestureMapping[] {
  const mappings = getGestureMappings(); const idx = mappings.findIndex(m => m.id === id);
  if (idx !== -1) { mappings[idx] = { ...mappings[idx], ...data }; set(KEYS.gestureMappings, mappings); }
  return mappings;
}

export function getVoiceCommands(): VoiceCommand[] {
  return get(KEYS.voiceCommands, [
    { id: 'v1', command: 'start drawing', action: 'activate_pen', language: 'en', isActive: true },
    { id: 'v2', command: 'stop drawing', action: 'deactivate_pen', language: 'en', isActive: true },
    { id: 'v3', command: 'clear board', action: 'clear_board', language: 'en', isActive: true },
    { id: 'v4', command: 'undo', action: 'undo', language: 'en', isActive: true },
    { id: 'v5', command: 'save', action: 'save_board', language: 'en', isActive: true },
    { id: 'v6', command: 'new board', action: 'new_board', language: 'en', isActive: false },
    { id: 'v7', command: 'change color to red', action: 'color_red', language: 'en', isActive: true },
    { id: 'v8', command: 'change color to blue', action: 'color_blue', language: 'en', isActive: true },
    { id: 'v9', command: 'increase size', action: 'increase_size', language: 'en', isActive: true },
    { id: 'v10', command: 'decrease size', action: 'decrease_size', language: 'en', isActive: true },
  ]);
}

export function getCloudFiles(): CloudFile[] { return get(KEYS.cloudFiles, []); }
export function addCloudFile(data: Partial<CloudFile>): CloudFile {
  const files = getCloudFiles();
  const f: CloudFile = { id: genId(), name: 'Untitled', type: 'board', mimeType: 'application/json', size: 0, url: '', createdBy: 'u1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isStarred: false, isSynced: true, ...data };
  files.unshift(f); set(KEYS.cloudFiles, files); return f;
}

export function getLectures(): Lecture[] { return get(KEYS.lectures, []); }
export function addLecture(data: Partial<Lecture>): Lecture {
  const lectures = getLectures();
  const l: Lecture = { id: genId(), classroomId: '', title: 'New Lecture', teacherId: 'u1', teacherName: 'Rajesh Kumar', startedAt: new Date().toISOString(), duration: 0, attendance: [], ...data };
  lectures.unshift(l); set(KEYS.lectures, lectures); return l;
}

export function getAttendance(): AttendanceRecord[] { return get(KEYS.attendance, []); }
export function getAISummaries(): AISummary[] { return get(KEYS.aiSummaries, []); }
export function getAIInsights(): AIInsight[] { return get(KEYS.aiInsights, []); }
export function getPolls(classroomId: string): Poll[] {
  const all = get<Record<string, Poll[]>>(KEYS.polls, {}); return all[classroomId] || [];
}
export function createPoll(classroomId: string, data: Partial<Poll>): Poll {
  const all = get<Record<string, Poll[]>>(KEYS.polls, {});
  if (!all[classroomId]) all[classroomId] = [];
  const p: Poll = { id: genId(), classroomId, question: '', options: [], createdAt: new Date().toISOString(), isActive: true, isAnonymous: false, type: 'single', ...data };
  all[classroomId].push(p); set(KEYS.polls, all); return p;
}

export function incrementGestureCount(amount?: number) {}
export function addCorrectionEntry(correction: any) {}

/* ── Logo / Branding ── */

export interface LogoConfig {
  type: 'default' | 'icon' | 'text' | 'image';
  imageData?: string;
  accentColor?: string;
}

const DEFAULT_LOGO: LogoConfig = { type: 'default', accentColor: '#6366f1' };

export function getLogo(): LogoConfig {
  return get(KEYS.logo, DEFAULT_LOGO);
}

export function setLogo(cfg: LogoConfig) {
  set(KEYS.logo, cfg);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('branding-changed'));
}

export function getAppName(): string {
  return get(KEYS.appName, 'EduBoard');
}

export function setAppName(name: string) {
  set(KEYS.appName, name);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('branding-changed'));
}

