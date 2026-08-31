/**
 * EduBoard Mobile Appium E2E Test Suite
 * Test assertions for Flutter / Android WebView Container.
 */

const mobileCategories = [
  {
    category: 'App Initialization',
    tests: [
      { title: 'Android App Launch', desc: 'Verifies native app splash screen and activity boot' },
      { title: 'WebView Container Boot', desc: 'Tests WebViewController initialization on port 3000' }
    ]
  },
  {
    category: 'Permissions & Hardware',
    tests: [
      { title: 'Camera Permission Request', desc: 'Grants camera access for MediaPipe gesture tracking' },
      { title: 'Microphone Permission Request', desc: 'Grants microphone access for Voice Board controls' },
      { title: 'Storage Permission Handler', desc: 'Grants storage permission for local file downloads' }
    ]
  },
  {
    category: 'Network & Connection',
    tests: [
      { title: 'Server IP Dialog Open', desc: 'Toggles floating action button connection dialog' },
      { title: 'Custom IP Endpoint Switch', desc: 'Updates server URL to custom LAN IP address' },
      { title: 'Offline Fallback Handler', desc: 'Triggers fallback URL when primary server is offline' }
    ]
  },
  {
    category: 'Touch Gestures',
    tests: [
      { title: 'Touch Canvas Draw', desc: 'Simulates single-finger drag gesture on whiteboard' },
      { title: 'Pinch to Zoom', desc: 'Simulates multi-touch pinch gesture on canvas area' }
    ]
  }
];

function getMobileTestCases() {
  const result = [];
  mobileCategories.forEach((c) => {
    c.tests.forEach((t) => {
      result.push({
        category: c.category,
        testName: t.title,
        description: t.desc
      });
    });
  });
  return result;
}

module.exports = { getMobileTestCases, mobileCategories };
