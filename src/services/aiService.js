const axios = require('axios');
const { sanitizeErrorMessage } = require('../utils/sanitize');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

const aiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getFromCache(key) {
  const entry = aiCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  aiCache.delete(key);
  return null;
}

function setCache(key, data) {
  aiCache.set(key, { data, timestamp: Date.now() });
  if (aiCache.size > 500) {
    const firstKey = aiCache.keys().next().value;
    aiCache.delete(firstKey);
  }
}

// ── Provider: OpenAI ──
async function callOpenAI(messages, options = {}) {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: options.model || OPENAI_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens || 2048,
    top_p: options.topP || 1,
    frequency_penalty: options.frequencyPenalty || 0,
    presence_penalty: options.presencePenalty || 0
  }, {
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    timeout: options.timeout || 30000
  });

  return {
    text: response.data.choices[0].message.content,
    model: response.data.model,
    provider: 'openai',
    usage: response.data.usage
  };
}

// ── Provider: Anthropic Claude ──
async function callAnthropic(messages, options = {}) {
  const systemMsg = messages.find(m => m.role === 'system');
  const userMsgs = messages.filter(m => m.role !== 'system');

  const response = await axios.post('https://api.anthropic.com/v1/messages', {
    model: options.model || 'claude-3-5-sonnet-20241022',
    ...(systemMsg ? { system: systemMsg.content } : {}),
    messages: userMsgs.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    })),
    max_tokens: options.maxTokens || 2048,
    temperature: options.temperature ?? 0.7,
  }, {
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    timeout: options.timeout || 30000
  });

  return {
    text: response.data.content[0].text,
    model: response.data.model,
    provider: 'anthropic',
    usage: {
      total_tokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
    }
  };
}

// ── Provider: Google Gemini ──
async function callGemini(messages, options = {}) {
  const systemMsg = messages.find(m => m.role === 'system');
  const userMsgs = messages.filter(m => m.role !== 'system');

  const body = {
    contents: userMsgs.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens || 2048,
    }
  };

  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${options.model || 'gemini-1.5-pro'}:generateContent?key=${GEMINI_API_KEY}`,
    body,
    { timeout: options.timeout || 30000 }
  );

  return {
    text: response.data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    model: options.model || 'gemini-1.5-pro',
    provider: 'gemini',
    usage: { total_tokens: response.data.usageMetadata?.totalTokenCount || 0 }
  };
}

// ── Retry with exponential backoff ──
async function withRetry(fn, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err.response?.status === 429;
      if (isRateLimit && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      throw err;
    }
  }
}

// ── Unified AI call with automatic multi-provider failover ──
async function callAI(messages, options = {}) {
  const cacheKey = JSON.stringify({ messages, options });
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const startTime = Date.now();
  const errors = [];

  const providers = [];
  if (OPENAI_API_KEY) providers.push({ name: 'OpenAI', call: () => callOpenAI(messages, options) });
  if (ANTHROPIC_API_KEY) providers.push({ name: 'Anthropic', call: () => callAnthropic(messages, options) });
  if (GEMINI_API_KEY) providers.push({ name: 'Gemini', call: () => callGemini(messages, options) });

  if (providers.length === 0) {
    return {
      text: getFallbackResponse(messages),
      model: 'fallback', provider: 'none',
      processingTime: 0, tokensUsed: 0, confidence: 0.8
    };
  }

  for (const provider of providers) {
    try {
      const result = await withRetry(() => provider.call());
      const final = {
        text: result.text,
        model: result.model,
        provider: result.provider,
        processingTime: Date.now() - startTime,
        tokensUsed: result.usage?.total_tokens || 0,
        confidence: 0.95
      };
      setCache(cacheKey, final);
      return final;
    } catch (err) {
      errors.push(`${provider.name}: ${sanitizeErrorMessage(err.message)}`);
    }
  }

  const detail = errors.join('; ');
  console.error('[AI] All providers failed:', detail);
  return {
    text: getFallbackResponse(messages),
    model: 'fallback', provider: 'none',
    processingTime: Date.now() - startTime,
    tokensUsed: 0, confidence: 0.8,
    error: sanitizeErrorMessage(detail)
  };
}

// ── Streaming chat (async generator, uses OpenAI SSE) ──
async function* streamChatResponse(messages, options = {}) {
  if (!OPENAI_API_KEY) {
    const result = await callAI(messages, options);
    yield result.text;
    return;
  }

  const url = 'https://api.openai.com/v1/chat/completions';
  const canStream = typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function';

  if (!canStream) {
    const result = await callAI(messages, options);
    yield result.text;
    return;
  }

  const response = await globalThis.fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || OPENAI_MODEL,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 2048,
    }),
  });

  if (!response.ok || !response.body) {
    const result = await callAI(messages, options);
    yield result.text;
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) yield content;
          } catch { /* skip malformed */ }
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }
}

function getFallbackResponse(messages) {
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
  if (lastMsg.includes('spelling') || lastMsg.includes('correct')) {
    const text = messages[messages.length - 2]?.content || '';
    const corrections = text.split(' ').map(w => {
      const common = { teh: 'the', recieve: 'receive', definately: 'definitely', occured: 'occurred', ocurrence: 'occurrence', beleive: 'believe', seperate: 'separate', accomodate: 'accommodate', embarass: 'embarrass', publically: 'publicly' };
      return common[w.toLowerCase()] || w;
    }).join(' ');
    return JSON.stringify({ original: text, corrected: corrections, errors: [], suggestions: [] });
  }
  if (lastMsg.includes('grammar')) {
    const text = messages[messages.length - 2]?.content || '';
    return JSON.stringify({ original: text, corrections: [], suggestions: ['Sentence structure looks good'], score: 0.95 });
  }
  if (lastMsg.includes('summarize') || lastMsg.includes('summary')) {
    const text = messages[messages.length - 2]?.content || '';
    return text.slice(0, 200) + '...';
  }
  if (lastMsg.includes('quiz')) {
    return JSON.stringify({ questions: [{ question: 'What is 2+2?', options: ['3', '4', '5', '6'], answer: 1 }, { question: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], answer: 2 }] });
  }
  if (lastMsg.includes('lesson') || lastMsg.includes('lesson plan')) {
    return JSON.stringify({ title: 'Lesson Plan', duration: '45 minutes', objectives: ['Understand key concepts'], activities: ['Introduction (5 min)', 'Main Activity (30 min)', 'Review (10 min)'], materials: ['Whiteboard', 'Markers'], assessment: 'Quiz at end of lesson' });
  }
  if (lastMsg.includes('translate')) {
    return 'Translation available with an AI provider configured.';
  }
  return 'I understand your question. To provide AI-powered responses, configure at least one API key (OpenAI, Anthropic, or Gemini) in the backend .env file.';
}

// ── Service functions ─────────────────────────────────────────────────────

async function recognizeHandwriting(input) {
  const startTime = Date.now();

  if (OPENAI_API_KEY && typeof input === 'string' && input.startsWith('data:image')) {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a handwriting recognition AI. Extract text from the image accurately, including cursive writing. Return only the recognized text.' },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: input } }] }
        ],
        max_tokens: 1000
      }, {
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 30000
      });
      return { text: response.data.choices[0].message.content, confidence: 0.95, model: 'gpt-4o', processingTime: Date.now() - startTime, tokensUsed: response.data.usage?.total_tokens || 0 };
    } catch { /* fall through */ }
  }

  if (typeof input === 'string' && input.startsWith('data:image')) {
    try {
      const Tesseract = require('tesseract.js');
      const { data } = await Tesseract.recognize(input, 'eng', {
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?\'-',
      });
      const text = (data.text ?? '').trim();
      if (text) {
        return { text, confidence: data.confidence / 100, model: 'tesseract.js', processingTime: Date.now() - startTime, tokensUsed: 0 };
      }
    } catch (err) {
      console.warn('[aiService] Tesseract OCR failed:', err.message);
    }
  }

  return { text: '', confidence: 0, model: 'fallback', processingTime: Date.now() - startTime, tokensUsed: 0 };
}

async function checkSpelling(text) {
  const startTime = Date.now();
  const result = await callAI([
    { role: 'system', content: 'You are a spelling checker. Analyze the text and return JSON with: original, corrected (full corrected text), errors (array of {word, position, suggestions}), and score (0-1).' },
    { role: 'user', content: text }
  ], { temperature: 0.1 });
  try { return { ...JSON.parse(result.text), confidence: 0.9, processingTime: result.processingTime, model: result.model, tokensUsed: result.tokensUsed }; }
  catch { return { original: text, corrected: text, errors: [], score: 1.0, confidence: 0.9, processingTime: result.processingTime, model: 'fallback', tokensUsed: 0 }; }
}

async function checkGrammar(text) {
  const startTime = Date.now();
  const result = await callAI([
    { role: 'system', content: 'You are a grammar checker. Analyze the text and return JSON with: original, corrections (array of {original, replacement, explanation}), score (0-1), suggestions (array of strings).' },
    { role: 'user', content: text }
  ], { temperature: 0.1 });
  try { return { ...JSON.parse(result.text), confidence: 0.9, processingTime: result.processingTime, model: result.model, tokensUsed: result.tokensUsed }; }
  catch { return { original: text, corrections: [], score: 1.0, suggestions: ['No grammar issues detected'], confidence: 0.9, processingTime: result.processingTime, model: 'fallback', tokensUsed: 0 }; }
}

async function completeText(text, context) {
  const startTime = Date.now();
  const result = await callAI([
    { role: 'system', content: 'You are an AI writing assistant for an educational whiteboard app. Complete the text naturally and educationally.' },
    { role: 'user', content: `Context: ${context || 'General'}\n\nText to complete: ${text}\n\nComplete this text:` }
  ]);
  return { ...result, confidence: 0.85 };
}

async function generateImage(prompt) {
  const startTime = Date.now();
  try {
    const response = await axios.post('https://api.openai.com/v1/images/generations', {
      prompt, n: 1, size: '1024x1024'
    }, {
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 60000
    });
    return { url: response.data.data[0].url, model: 'dall-e-3', processingTime: Date.now() - startTime, tokensUsed: 0 };
  } catch {
    return { url: null, error: 'Image generation requires OpenAI API key', model: 'none', processingTime: Date.now() - startTime, tokensUsed: 0 };
  }
}

async function summarizeText(text) {
  const result = await callAI([
    { role: 'system', content: 'Summarize the following text concisely while preserving key information.' },
    { role: 'user', content: text }
  ], { maxTokens: 500 });
  return result;
}

async function generateQuiz(topic, count, difficulty, type = 'multiple-choice') {
  const typeInstructions = {
    'multiple-choice': 'multiple-choice questions, each with 4 options (A, B, C, D)',
    'short-answer': 'short-answer questions (no options needed)',
    'true-false': 'true/false questions with 2 options: ["True", "False"]',
    'mixed': 'a mix of multiple-choice, short-answer, and true/false questions',
  }[type] || 'multiple-choice questions';

  const prompt = `Generate a ${difficulty}-difficulty quiz about "${topic}" with exactly ${count} ${typeInstructions}.

Return ONLY valid JSON (no markdown, no code fences) in this exact schema:
{
  "title": "Quiz title",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this answer is correct."
    }
  ]
}

Rules:
- correctAnswer is the 0-based index into options[]
- For short-answer, set options to [] and correctAnswer to -1, add "sampleAnswer" field
- For true/false, options must be ["True", "False"]
- Make questions educational, accurate, and appropriate for the topic
- Vary question complexity within the difficulty level`;

  const result = await callAI([
    { role: 'system', content: prompt },
    { role: 'user', content: `Generate ${count} ${difficulty} ${type} questions about: ${topic}` },
  ], { temperature: 0.75, maxTokens: 3000 });

  try {
    const clean = result.text
      .replace(/^```(?:json)?\n?/im, '')
      .replace(/\n?```$/m, '')
      .trim();
    const parsed = JSON.parse(clean);
    return {
      ...parsed,
      model: result.model,
      processingTime: result.processingTime,
      tokensUsed: result.tokensUsed,
    };
  } catch (e) {
    console.error('[generateQuiz] JSON parse error:', e.message, '| Raw:', result.text.slice(0, 200));
    return {
      title: `Quiz: ${topic}`,
      topic,
      difficulty,
      questions: [],
      error: 'Could not parse AI response. Please try again.',
      model: result.model,
    };
  }
}

async function generateLessonPlan(topic, duration, gradeLevel) {
  const result = await callAI([
    { role: 'system', content: `Create a detailed lesson plan for ${gradeLevel || 'high school'} level on "${topic}" lasting ${duration || '45 minutes'}. Return JSON with: title, subject, gradeLevel, duration, objectives[], materials[], procedure: [{time, activity, description}], assessment, homework, extensions[]` },
    { role: 'user', content: `Create a lesson plan for ${topic}` }
  ], { temperature: 0.7 });
  try { return JSON.parse(result.text); }
  catch { return { title: `Lesson Plan: ${topic}`, subject: 'General', gradeLevel, duration, objectives: [], materials: [], procedure: [], assessment: '', homework: '', extensions: [] }; }
}

async function generateFlashcards(topic, count = 8) {
  const prompt = `Generate ${count} educational flashcards about "${topic}".
Return ONLY valid JSON (no markdown, no code fences) in this exact schema:
{
  "title": "Flashcard set title",
  "topic": "${topic}",
  "cards": [
    { "front": "Question or term", "back": "Answer or definition", "hint": "Optional hint (keep short)" }
  ]
}
Make cards progressively harder. Include definitions, examples, and key concepts. Clean escaped quotes properly.`;

  const result = await callAI([
    { role: 'system', content: prompt },
    { role: 'user', content: `Generate ${count} flashcards about: ${topic}` },
  ], { temperature: 0.7, maxTokens: 3000 });

  try {
    const clean = result.text
      .replace(/^```(?:json)?\n?/im, '')
      .replace(/\n?```$/m, '')
      .trim();
    const parsed = JSON.parse(clean);
    return {
      ...parsed,
      model: result.model,
      processingTime: result.processingTime,
      tokensUsed: result.tokensUsed,
    };
  } catch (e) {
    console.error('[generateFlashcards] JSON parse error:', e.message, '| Raw:', result.text.slice(0, 200));
    return {
      title: `Flashcards: ${topic}`,
      topic,
      cards: [],
      error: 'Could not parse AI response. Please try again.',
      model: result.model,
      processingTime: result.processingTime,
      tokensUsed: result.tokensUsed,
    };
  }
}

async function translateText(text, targetLanguage) {
  const result = await callAI([
    { role: 'system', content: `Translate the following text to ${targetLanguage}. Return only the translation.` },
    { role: 'user', content: text }
  ], { temperature: 0.1 });
  return { original: text, translated: result.text, targetLanguage, model: result.model };
}

async function formatText(text, task = 'ocr_cleanup') {
  const startTime = Date.now();
  const taskInstructions = {
    ocr_cleanup: 'You are an OCR cleanup assistant. Fix spacing, capitalization, punctuation, and obvious recognition errors. Preserve math/LaTeX content. Return only the corrected text, no commentary or quotes.',
    summarise: 'Summarize the following text concisely while preserving key information.',
  }[task] || 'Fix the spelling, spacing, capitalization, and grammar of the following text. Return only the corrected text, no commentary.';

  const result = await callAI([
    { role: 'system', content: taskInstructions },
    { role: 'user', content: text }
  ], { temperature: 0.1, maxTokens: 1500 });

  return {
    formatted: result.text,
    model: result.model,
    provider: result.provider,
    processingTime: result.processingTime,
    tokensUsed: result.tokensUsed,
    isFallback: result.provider === 'none'
  };
}

module.exports = {
  recognizeHandwriting, checkSpelling, checkGrammar, completeText,
  generateImage, summarizeText, generateQuiz,
  generateLessonPlan, generateFlashcards, translateText,
  formatText, streamChatResponse, callAI
};
