const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'whisper-1';
const STT_CACHE_TTL = parseInt(process.env.STT_CACHE_TTL || '300000', 10);
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

const voiceCommands = {
  'draw_shape': { handler: 'drawShape', params: ['shapeType'], description: 'Draws a shape on the board' },
  'change_color': { handler: 'changeColor', params: ['color'], description: 'Changes the drawing color' },
  'clear_board': { handler: 'clearBoard', params: [], description: 'Clears the entire board' },
  'undo': { handler: 'undo', params: [], description: 'Undoes the last action' },
  'redo': { handler: 'redo', params: [], description: 'Redoes the last undone action' },
  'save': { handler: 'save', params: [], description: 'Saves the current board' },
  'export': { handler: 'export', params: ['format'], description: 'Exports the board' },
  'zoom_in': { handler: 'zoomIn', params: [], description: 'Zooms into the board' },
  'zoom_out': { handler: 'zoomOut', params: [], description: 'Zooms out of the board' },
  'add_text': { handler: 'addText', params: ['text'], description: 'Adds text to the board' },
  'delete_selected': { handler: 'deleteSelected', params: [], description: 'Deletes the selected shape' },
  'collaborate': { handler: 'inviteCollaborator', params: ['email'], description: 'Invites a user to collaborate' },
  'switch_theme': { handler: 'switchTheme', params: ['theme'], description: 'Changes the UI theme' }
};

const WHISPER_LANG_MAP = {
  en: 'en', es: 'es', fr: 'fr', de: 'de',
  hi: 'hi', ja: 'ja', zh: 'zh', ko: 'ko',
  pt: 'pt', it: 'it', ru: 'ru', ar: 'ar',
  nl: 'nl', pl: 'pl', tr: 'tr', vi: 'vi',
};

let transcriptionCache = new Map();

function getAudioFormat(audioInput) {
  if (audioInput.startsWith('data:audio/webm')) return 'webm';
  if (audioInput.startsWith('data:audio/wav') || audioInput.startsWith('data:audio/wave')) return 'wav';
  if (audioInput.startsWith('data:audio/ogg')) return 'ogg';
  if (audioInput.startsWith('data:audio/mp3') || audioInput.startsWith('data:audio/mpeg')) return 'mp3';
  if (audioInput.startsWith('data:audio/mp4')) return 'mp4';
  if (audioInput.startsWith('data:audio/x-m4a')) return 'm4a';
  if (audioInput.startsWith('data:audio/flac')) return 'flac';
  if (audioInput.startsWith('data:audio/')) return 'webm';
  if (audioInput.startsWith('blob:')) return 'webm';
  return null;
}

function isAudioInput(audioInput) {
  return audioInput.startsWith('data:audio') || audioInput.startsWith('blob:');
}

async function transcribeAudio(audioInput, options = {}) {
  const startTime = Date.now();
  const {
    language = 'en',
    formatResponse = true,
    task = 'transcribe',
    prompt = '',
    temperature = 0,
  } = options;

  if (!OPENAI_API_KEY) {
    return {
      success: false,
      error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.',
      transcript: '',
      processed: '',
      confidence: 0,
      processingTime: Date.now() - startTime,
    };
  }

  const format = getAudioFormat(audioInput);
  if (!format) {
    return {
      success: false,
      error: `Unsupported or unrecognised audio format. Expected data:audio/* or blob: URL.`,
      transcript: '',
      processed: '',
      confidence: 0,
      processingTime: Date.now() - startTime,
    };
  }

  const cacheKey = crypto.createHash('md5').update(audioInput.slice(0, 4000)).digest('hex');
  const cached = transcriptionCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < STT_CACHE_TTL) {
    return { ...cached, cached: true, processingTime: Date.now() - startTime };
  }

  let buffer;
  try {
    if (audioInput.startsWith('data:')) {
      const commaIdx = audioInput.indexOf(',');
      if (commaIdx === -1) {
        return { success: false, error: 'Invalid data URI format', transcript: '', processed: '', confidence: 0, processingTime: Date.now() - startTime };
      }
      const base64Data = audioInput.slice(commaIdx + 1);
      buffer = Buffer.from(base64Data, 'base64');
    } else if (audioInput.startsWith('blob:')) {
      return { success: false, error: 'blob: URLs must be resolved client-side before sending to server', transcript: '', processed: '', confidence: 0, processingTime: Date.now() - startTime };
    } else {
      buffer = Buffer.from(audioInput, 'base64');
    }
  } catch (err) {
    return { success: false, error: `Audio decoding error: ${err.message}`, transcript: '', processed: '', confidence: 0, processingTime: Date.now() - startTime };
  }

  if (buffer.length === 0) {
    return { success: false, error: 'Empty audio data received', transcript: '', processed: '', confidence: 0, processingTime: Date.now() - startTime };
  }

  if (buffer.length > MAX_AUDIO_SIZE) {
    return { success: false, error: `Audio too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Max: 25MB.`, transcript: '', processed: '', confidence: 0, processingTime: Date.now() - startTime };
  }

  const tmpFile = path.join(os.tmpdir(), `stt_${crypto.randomBytes(8).toString('hex')}.${format}`);
  try {
    fs.writeFileSync(tmpFile, buffer);

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(tmpFile), {
      filename: `audio.${format}`,
      contentType: `audio/${format}`,
    });
    form.append('model', WHISPER_MODEL);
    form.append('response_format', 'verbose_json');

    if (language && language !== 'auto') {
      const whisperLang = WHISPER_LANG_MAP[language] || language;
      form.append('language', whisperLang);
    }

    if (task === 'translate') {
      form.append('task', 'translate');
    }

    if (prompt) {
      form.append('prompt', prompt);
    }

    if (temperature > 0) {
      form.append('temperature', String(temperature));
    }

    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      timeout: 60000,
      maxContentLength: MAX_AUDIO_SIZE,
    });

    const result = response.data;
    const transcript = (result.text || '').trim();
    const segments = result.segments || [];
    const avgConfidence = segments.length > 0
      ? segments.reduce((sum, s) => sum + (s.avg_logprob ? Math.exp(s.avg_logprob) : 0.8), 0) / segments.length
      : 0.85;
    const confidence = Math.min(Math.max(avgConfidence, 0), 1);
    const durationMs = result.duration ? Math.round(result.duration * 1000) : 0;
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;

    let processed = transcript;
    let formattingApplied = false;
    if (formatResponse && transcript) {
      try {
        const formattingService = require('./formattingService');
        const fmtResult = await formattingService.formatTextBlock(transcript, {
          task: 'voice_cleanup',
          language,
        });
        processed = fmtResult.formatted || transcript;
        formattingApplied = fmtResult.source === 'openai';
      } catch {
        processed = transcript;
      }
    }

    const output = {
      success: true,
      transcript,
      processed,
      confidence: Math.round(confidence * 1000) / 1000,
      language: result.language || language,
      durationMs,
      wordCount,
      segments: segments.length,
      formattingApplied,
      processingTime: Date.now() - startTime,
      source: 'whisper',
    };

    transcriptionCache.set(cacheKey, { ...output, timestamp: Date.now() });
    if (transcriptionCache.size > 500) {
      const keys = [...transcriptionCache.keys()].slice(0, 100);
      keys.forEach(k => transcriptionCache.delete(k));
    }

    return output;
  } catch (err) {
    const status = err.response?.status;
    const whisperError = err.response?.data?.error?.message || err.message;

    if (status === 413) {
      return { success: false, error: 'Audio file too large for Whisper API', transcript: '', processed: '', confidence: 0, processingTime: Date.now() - startTime };
    }
    if (status === 415) {
      return { success: false, error: `Unsupported audio format. Whisper supports: flac, m4a, mp3, mp4, mpeg, ogg, opus, wav, webm`, transcript: '', processed: '', confidence: 0, processingTime: Date.now() - startTime };
    }
    if (status === 429) {
      return { success: false, error: 'Rate limited by Whisper API. Please wait and try again.', transcript: '', processed: '', confidence: 0, processingTime: Date.now() - startTime };
    }
    if (status === 401) {
      return { success: false, error: 'Invalid OpenAI API key', transcript: '', processed: '', confidence: 0, processingTime: Date.now() - startTime };
    }

    return {
      success: false,
      error: `Whisper transcription failed: ${whisperError}`,
      transcript: '',
      processed: '',
      confidence: 0,
      processingTime: Date.now() - startTime,
    };
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

async function transcribeAudioChunked(audioChunks, options = {}) {
  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < audioChunks.length; i++) {
    const chunk = audioChunks[i];
    const result = await transcribeAudio(chunk, {
      ...options,
      prompt: i > 0 ? results[i - 1].transcript?.slice(-200) : options.prompt,
    });
    results.push(result);
    if (!result.success) break;
  }

  const successful = results.filter(r => r.success);
  const combinedTranscript = successful.map(r => r.transcript).join(' ').trim();
  const combinedProcessed = successful.map(r => r.processed).join(' ').trim();
  const avgConfidence = successful.length > 0
    ? successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length
    : 0;
  const totalDuration = successful.reduce((sum, r) => sum + (r.durationMs || 0), 0);
  const totalWords = successful.reduce((sum, r) => sum + (r.wordCount || 0), 0);

  return {
    success: successful.length === audioChunks.length,
    transcript: combinedTranscript,
    processed: combinedProcessed,
    confidence: Math.round(avgConfidence * 1000) / 1000,
    durationMs: totalDuration,
    wordCount: totalWords,
    chunks: results.length,
    errors: results.filter(r => !r.success).length,
    processingTime: Date.now() - startTime,
    source: 'whisper-chunked',
  };
}

function clearCache() {
  transcriptionCache.clear();
}

async function processCommand(audioInput, language = 'en') {
  const startTime = Date.now();

  if (isAudioInput(audioInput)) {
    return processAudioInput(audioInput, language);
  }

  const text = typeof audioInput === 'string' ? audioInput : '';
  const normalized = text.toLowerCase().trim();
  const result = parseCommand(normalized, text);

  return {
    original: text,
    intent: result.intent,
    confidence: result.confidence,
    params: result.params,
    executed: true,
    processingTime: Date.now() - startTime
  };
}

async function processAudioInput(audioData, language) {
  if (!OPENAI_API_KEY) {
    return {
      original: '(audio input)',
      intent: 'unknown',
      confidence: 0,
      params: {},
      executed: false,
      transcript: 'Audio processing requires OpenAI API key',
      processingTime: 0
    };
  }

  try {
    const sttResult = await transcribeAudio(audioData, {
      language,
      formatResponse: false,
      task: 'transcribe',
    });

    if (!sttResult.success) {
      return {
        original: '(audio input)',
        intent: 'unknown',
        confidence: 0,
        params: {},
        executed: false,
        transcript: sttResult.error,
        processingTime: sttResult.processingTime,
      };
    }

    const transcript = sttResult.transcript;
    const result = parseCommand(transcript.toLowerCase().trim(), transcript);
    return {
      ...result,
      original: '(audio input)',
      transcript,
      confidence: Math.min(result.confidence, sttResult.confidence),
    };
  } catch {
    return {
      original: '(audio input)',
      intent: 'unknown',
      confidence: 0,
      params: {},
      executed: false,
      transcript: '',
      processingTime: 0
    };
  }
}

function parseCommand(normalized, original) {
  const intents = [
    { pattern: /^(draw|create|add)\s+(a\s+)?(circle|rectangle|square|triangle|line|arrow|diamond|star|hexagon)/, intent: 'draw_shape', confidence: 0.95, extract: (m) => ({ shapeType: m[3] }) },
    { pattern: /^change\s+color\s+to\s+(.+)/, intent: 'change_color', confidence: 0.95, extract: (m) => ({ color: m[1] }) },
    { pattern: /^set\s+color\s+(.+)/, intent: 'change_color', confidence: 0.9, extract: (m) => ({ color: m[1] }) },
    { pattern: /^(clear|erase|wipe|delete all)(\s+the)?\s+(board|canvas|whiteboard|everything)/, intent: 'clear_board', confidence: 0.95, extract: () => ({}) },
    { pattern: /^(clear|erase|wipe|delete\s+all)/, intent: 'clear_board', confidence: 0.85, extract: () => ({}) },
    { pattern: /^undo(\s+that)?/, intent: 'undo', confidence: 0.95, extract: () => ({}) },
    { pattern: /^redo(\s+that)?/, intent: 'redo', confidence: 0.95, extract: () => ({}) },
    { pattern: /^(save|store)\s+(the\s+)?(board|whiteboard)/, intent: 'save', confidence: 0.9, extract: () => ({}) },
    { pattern: /^save/, intent: 'save', confidence: 0.85, extract: () => ({}) },
    { pattern: /^export(\s+(as|to)\s+)?(pdf|png|svg|json|pptx|docx|html|markdown)?/, intent: 'export', confidence: 0.9, extract: (m) => ({ format: m[3] || 'pdf' }) },
    { pattern: /^(zoom\s+in|magnify)/, intent: 'zoom_in', confidence: 0.95, extract: () => ({}) },
    { pattern: /^(zoom\s+out|shrink)/, intent: 'zoom_out', confidence: 0.95, extract: () => ({}) },
    { pattern: /^add\s+text(\s+(.+))?/, intent: 'add_text', confidence: 0.9, extract: (m) => ({ text: m[2] || '' }) },
    { pattern: /^(write|type)\s+(.+)/, intent: 'add_text', confidence: 0.85, extract: (m) => ({ text: m[2] }) },
    { pattern: /^(delete|remove)\s+(selected|this|that|it)/, intent: 'delete_selected', confidence: 0.9, extract: () => ({}) },
    { pattern: /^delete(\s+selected)?/, intent: 'delete_selected', confidence: 0.8, extract: () => ({}) },
    { pattern: /^(what|who|how|why|when|where|explain|define|tell me|help me)/, intent: 'ai_help', confidence: 0.9, extract: (m) => ({ query: original }) },
    { pattern: /^invite\s+(.+)/, intent: 'collaborate', confidence: 0.9, extract: (m) => ({ email: m[1] }) },
    { pattern: /^add\s+collaborator\s+(.+)/, intent: 'collaborate', confidence: 0.85, extract: (m) => ({ email: m[1] }) },
    { pattern: /^(switch|change)\s+to\s+(dark|light|neon|educational|sepia|high.contrast)\s+(mode|theme)?/, intent: 'switch_theme', confidence: 0.9, extract: (m) => ({ theme: m[2] }) },
    { pattern: /^(dark|light|neon)\s+(mode|theme)/, intent: 'switch_theme', confidence: 0.85, extract: (m) => ({ theme: m[1] }) }
  ];

  for (const { pattern, intent, confidence, extract } of intents) {
    const match = normalized.match(pattern);
    if (match) {
      const params = extract(match);
      return { intent, confidence, params, executed: true };
    }
  }

  return { intent: 'unknown', confidence: 0.1, params: {}, executed: false };
}

module.exports = { processCommand, transcribeAudio, transcribeAudioChunked, clearCache, voiceCommands, getAudioFormat, isAudioInput };
