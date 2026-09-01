describe('AI Service', () => {
  const aiService = require('../../../../src/services/aiService');

  test('checkSpelling returns corrected text', async () => {
    const result = await aiService.checkSpelling('The quick brown fox');
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  test('checkGrammar returns analysis', async () => {
    const result = await aiService.checkGrammar('She go to school');
    expect(result).toBeDefined();
  });

  test('summarizeText returns summary', async () => {
    const result = await aiService.summarizeText('Long text to summarize here');
    expect(result).toBeDefined();
  });

  test('generateQuiz returns questions', async () => {
    const result = await aiService.generateQuiz('Math', 3, 'easy');
    expect(result).toBeDefined();
  });
});

describe('Auth Service', () => {
  const { hashPassword, comparePassword, generateToken, verifyToken } = require('../../../../src/middleware/auth');

  test('hashPassword generates hash', async () => {
    const hash = await hashPassword('test123');
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(20);
  });

  test('comparePassword matches correctly', async () => {
    const hash = await hashPassword('test123');
    const match = await comparePassword('test123', hash);
    expect(match).toBe(true);
  });

  test('comparePassword rejects wrong password', async () => {
    const hash = await hashPassword('test123');
    const match = await comparePassword('wrong', hash);
    expect(match).toBe(false);
  });

  test('generateToken creates valid JWT', async () => {
    const token = generateToken({ id: '1', email: 'test@test.com', role: 'teacher' });
    expect(token).toBeDefined();
    const decoded = await verifyToken(token);
    expect(decoded).toBeDefined();
    expect(decoded.email).toBe('test@test.com');
  });

  test('verifyToken rejects invalid token', async () => {
    const result = await verifyToken('invalid.token.here');
    expect(result).toBeNull();
  });
});

describe('Voice Service', () => {
  const voiceService = require('../../../../src/services/voiceService');

  test('processCommand parses draw shape', async () => {
    const result = await voiceService.processCommand('draw a circle');
    expect(result.intent).toBe('draw_shape');
    expect(result.executed).toBe(true);
  });

  test('processCommand parses clear board', async () => {
    const result = await voiceService.processCommand('clear the board');
    expect(result.intent).toBe('clear_board');
  });

  test('processCommand parses undo', async () => {
    const result = await voiceService.processCommand('undo');
    expect(result.intent).toBe('undo');
  });

  test('processCommand parses save', async () => {
    const result = await voiceService.processCommand('save');
    expect(result.intent).toBe('save');
  });

  test('processCommand parses zoom in', async () => {
    const result = await voiceService.processCommand('zoom in');
    expect(result.intent).toBe('zoom_in');
  });

  test('processCommand parses theme switch', async () => {
    const result = await voiceService.processCommand('switch to dark mode');
    expect(result.intent).toBe('switch_theme');
  });

  test('processCommand handles unknown command', async () => {
    const result = await voiceService.processCommand('xyz unknown command');
    expect(result.intent).toBe('unknown');
  });

  test('localSttEngine transcribes audio buffer without API key', async () => {
    const localSttEngine = require('../../../../src/services/localSttEngine');
    const dummyAudioBuffer = Buffer.from('RIFF....WAVEfmt ....data....', 'utf8');
    const result = await localSttEngine.decodeAudioToText(dummyAudioBuffer, { language: 'en' });
    expect(result.success).toBe(true);
    expect(result.transcript).toBeTruthy();
    expect(result.source).toBe('local-trained-stt');
  });

  test('localSttEngine supports runtime model training', () => {
    const localSttEngine = require('../../../../src/services/localSttEngine');
    const trainResult = localSttEngine.trainModel({
      phrase: 'calculate derivative of x squared',
      category: 'math_calculus',
      keywords: ['calculate', 'derivative']
    });
    expect(trainResult.success).toBe(true);
    expect(trainResult.trainedPhrase).toBe('calculate derivative of x squared');
    
    const status = localSttEngine.getModelStatus();
    expect(status.totalVocabulary).toBeGreaterThan(5);
  });
});

describe('Encryption Service', () => {
  const encryption = require('../../../../src/services/encryptionService');

  test('encrypt/decrypt roundtrip', () => {
    const original = 'sensitive data here';
    const encrypted = encryption.encrypt(original, 'password123');
    expect(encrypted.encrypted).not.toBe(original);
    const decrypted = encryption.decrypt(encrypted, 'password123');
    expect(decrypted).toBe(original);
  });

  test('decrypt with wrong password fails', () => {
    const encrypted = encryption.encrypt('test', 'password');
    expect(() => encryption.decrypt(encrypted, 'wrong')).toThrow();
  });

  test('hash produces consistent output', () => {
    const h1 = encryption.hash('hello');
    const h2 = encryption.hash('hello');
    expect(h1).toBe(h2);
  });

  test('generateSessionToken creates random token', () => {
    const t1 = encryption.generateSessionToken();
    const t2 = encryption.generateSessionToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBe(64);
  });
});

describe('Export Service', () => {
  const path = require('path');
  const fs = require('fs');
  const exportService = require('../../../../src/services/exportService');

  const mockWhiteboard = {
    id: 'wb1', title: 'Test Board', description: 'Test',
    background_color: '#ffffff', width: 800, height: 600, created_at: new Date().toISOString()
  };

  const mockShapes = [
    { id: 's1', type: 'rectangle', data: { x: 100, y: 100, width: 200, height: 150 }, style: { fillColor: '#6366f1', strokeColor: '#000', strokeWidth: 2 }, z_index: 0, opacity: 1, rotation: 0 },
    { id: 's2', type: 'text', data: { x: 50, y: 50, text: 'Hello World' }, style: { fontColor: '#000', fontSize: 24, fontFamily: 'Arial' }, z_index: 1, opacity: 1, rotation: 0 },
  ];

  test('export to JSON works', async () => {
    const tmpFile = path.join(__dirname, 'test_export.json');
    await exportService.export(mockWhiteboard, mockShapes, 'json', {}, tmpFile);
    expect(fs.existsSync(tmpFile)).toBe(true);
    const data = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
    expect(data.version).toBe('2.0');
    expect(data.shapes).toHaveLength(2);
    fs.unlinkSync(tmpFile);
  });

  test('export to HTML works', async () => {
    const tmpFile = path.join(__dirname, 'test_export.html');
    await exportService.export(mockWhiteboard, mockShapes, 'html', {}, tmpFile);
    expect(fs.existsSync(tmpFile)).toBe(true);
    const content = fs.readFileSync(tmpFile, 'utf8');
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('Hello World');
    fs.unlinkSync(tmpFile);
  });

  test('export to Markdown works', async () => {
    const tmpFile = path.join(__dirname, 'test_export.md');
    await exportService.export(mockWhiteboard, mockShapes, 'markdown', {}, tmpFile);
    expect(fs.existsSync(tmpFile)).toBe(true);
    const content = fs.readFileSync(tmpFile, 'utf8');
    expect(content).toContain('Test Board');
    fs.unlinkSync(tmpFile);
  });
});
