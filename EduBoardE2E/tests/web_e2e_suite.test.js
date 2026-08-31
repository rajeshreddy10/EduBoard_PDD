/**
 * EduBoard Selenium Web E2E Test Suite
 * End-to-End browser automated test cases across 10 core application modules.
 */

const testCategories = [
  {
    category: 'Authentication',
    tests: [
      { title: 'User Login Validation', desc: 'Validates user authentication with email and password' },
      { title: 'User Registration / Signup', desc: 'Verifies new user registration flow and password hashing' },
      { title: 'Password Reset Request', desc: 'Tests forgotten password recovery email trigger' },
      { title: 'Session Persistence', desc: 'Ensures JWT auth token persists across page reloads' }
    ]
  },
  {
    category: 'Whiteboard Canvas',
    tests: [
      { title: 'Canvas Rendering', desc: 'Verifies HTML5 2D canvas initialization' },
      { title: 'Pen & Brush Drawing', desc: 'Tests stroke rendering and line smoothing engine' },
      { title: 'Geometric Shape Detector', desc: 'Verifies automatic circle/rectangle shape recognition' },
      { title: 'Eraser Tool Execution', desc: 'Ensures pixel erasure on active canvas layers' }
    ]
  },
  {
    category: 'Voice Control',
    tests: [
      { title: 'Voice Engine Initialization', desc: 'Verifies Web Speech API transcriber activation' },
      { title: 'Scientific Formula Parser', desc: 'Parses spoken math equations into KaTeX syntax' },
      { title: 'Voice Export Commands', desc: 'Triggers document export via voice trigger' }
    ]
  },
  {
    category: 'Navigation & Layout',
    tests: [
      { title: 'Sidebar Toggle', desc: 'Verifies collapsible navigation drawer' },
      { title: 'Header & Waypoint Bar', desc: 'Tests breadcrumb navigation and board quick-switch' },
      { title: 'Theme Switcher', desc: 'Toggles between Dark mode and Light mode themes' }
    ]
  },
  {
    category: 'Classroom & Collaboration',
    tests: [
      { title: 'Classroom Session Join', desc: 'Tests joining live interactive classroom by room code' },
      { title: 'Real-time Socket Sync', desc: 'Verifies WebSocket canvas stroke synchronization' },
      { title: 'Student Attendance Tracker', desc: 'Ensures real-time student list updates' }
    ]
  },
  {
    category: 'AI Assistant',
    tests: [
      { title: 'AI Notes Maker', desc: 'Generates AI summary notes from whiteboard content' },
      { title: 'AI Problem Solver', desc: 'Queries AI backend for step-by-step math solutions' }
    ]
  },
  {
    category: 'Document Viewer',
    tests: [
      { title: 'PDF / Image Import', desc: 'Loads PDF document slides onto active board' },
      { title: 'Document Zoom & Pan', desc: 'Tests multi-touch pan and zoom transformations' }
    ]
  },
  {
    category: 'Settings & Security',
    tests: [
      { title: 'Security Profile Page', desc: 'Verifies active sessions list and device tracking' },
      { title: 'API Key Rotation', desc: 'Tests encryption key rotation utility' }
    ]
  }
];

function getWebTestCases() {
  const result = [];
  testCategories.forEach((cat) => {
    cat.tests.forEach((t) => {
      result.push({
        category: cat.category,
        testName: t.title,
        description: t.desc
      });
    });
  });
  return result;
}

module.exports = { getWebTestCases, testCategories };
