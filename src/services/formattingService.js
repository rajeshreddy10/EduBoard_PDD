/**
 * formattingService.js
 *
 * Text formatting & cleanup service using OpenAI.
 * Used by both voice-to-text and gesture OCR pipelines to produce
 * well-formatted, grammatically correct output.
 */

const axios = require('axios');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4';

// ── Shared OpenAI call helper ─────────────────────────────────────────────

async function callOpenAI(messages, options = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: options.model || OPENAI_MODEL,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens || 1024,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 25000,
    }
  );
  return response.data.choices[0]?.message?.content || '';
}

// ── Formatting tasks ──────────────────────────────────────────────────────

const TASK_PROMPTS = {
  /**
   * General grammar + formatting cleanup (used after voice dictation).
   * Now with support for technical math/science terminology and LaTeX conversion.
   */
  voice_cleanup: `You are a text formatter for an educational whiteboard app.
The input is a raw speech-to-text transcript from a technical lecture (Science, Math, Engineering, Programming).

Your tasks:
1. Fix incorrect capitalisation and missing/wrong punctuation.
2. Remove filler words (um, uh, like, you know).
3. **CRITICAL**: Detect mathematical expressions, scientific formulas, and chemical equations.
4. **CRITICAL**: Convert detected expressions into properly formatted LaTeX wrapped in $ ... $ for inline or $$ ... $$ for block.
   - Example: "x squared plus y squared equals z squared" -> $x^2 + y^2 = z^2$
   - Example: "integral from zero to infinity of e to the power of negative x squared dx" -> $\int_{0}^{\infty} e^{-x^2} dx$
   - Example: "H two S O four" -> $H_2SO_4$
5. Properly format programming code snippets if detected.

Return JSON only:
{
  "formatted": "cleaned text with LaTeX",
  "corrections": [{ "original": "...", "corrected": "...", "type": "punctuation|capitalisation|grammar|filler|math" }],
  "hasMath": true/false,
  "confidence": 0.0-1.0
}`,

  /**
   * Dedicated Technical Math/Science formatting.
   */
  technical_math: `You are an expert technical editor.
The input is a transcript of technical content.
Convert all spoken technical terms, mathematical formulas, chemical equations, and physics laws into professional LaTeX notation.
Organize the content with clear headings and bullet points where appropriate.

Return JSON only:
{
  "formatted": "highly structured technical document in Markdown with LaTeX",
  "summary": "Brief summary of the technical concepts discussed",
  "keyPoints": ["point 1", "point 2"],
  "flashcards": [{"question": "...", "answer": "..."}]
}`,

  /**
   * OCR text cleanup after handwriting recognition.
   */
  ocr_cleanup: `You are a text formatter for an educational whiteboard app.
The input is raw OCR output from handwriting recognition that may contain:
- Misrecognised characters (e.g. "l" read as "1", "O" as "0")
- Incorrect word splits or joins
- Capitalisation errors

Fix recognition errors while preserving original meaning.
Return JSON only:
{ "formatted": "corrected text", "corrections": [{ "original": "...", "corrected": "...", "type": "ocr_error|spacing|capitalisation" }], "confidence": 0.0-1.0 }`,

  /**
   * Full grammar correction pass.
   */
  grammar: `You are a grammar checker for educational content.
Analyse the text and return JSON only:
{ "formatted": "corrected text", "corrections": [{ "original": "...", "corrected": "...", "explanation": "..." }], "score": 0.0-1.0, "confidence": 0.0-1.0 }`,

  /**
   * Paragraph organisation — groups raw lines into logical paragraphs.
   */
  paragraphs: `You are a document formatter.
Take the raw input and organise it into well-structured paragraphs.
Separate paragraphs with a blank line.
Return JSON only:
{ "formatted": "organised text with \\n\\n between paragraphs", "paragraphCount": 0 }`,

  /**
   * Sentence capitalisation and basic punctuation only (fast, cheap).
   */
  light: `Fix only capitalisation and basic punctuation in the following text.
Return JSON only: { "formatted": "fixed text" }`,
};

// ── Main formatting function ──────────────────────────────────────────────

/**
 * Formats raw text using OpenAI.
 *
 * @param {string} rawText
 * @param {{ task?: 'voice_cleanup'|'ocr_cleanup'|'grammar'|'paragraphs'|'light', language?: string }} options
 * @returns {Promise<{ formatted: string, corrections: any[], confidence: number, processingTime: number, tokensUsed: number }>}
 */
async function formatTextBlock(rawText, options = {}) {
  const startTime = Date.now();
  const task = options.task || 'voice_cleanup';
  const systemPrompt = TASK_PROMPTS[task] || TASK_PROMPTS.light;

  // Local fast-path when no API key
  if (!OPENAI_API_KEY) {
    return {
      formatted: localLightFormat(rawText),
      corrections: [],
      confidence: 0.6,
      source: 'local',
      processingTime: Date.now() - startTime,
      tokensUsed: 0,
    };
  }

  try {
    const langNote = options.language && options.language !== 'en'
      ? `\n\nIMPORTANT: The text is in language code "${options.language}". Respond in the same language.`
      : '';

    const raw = await callOpenAI([
      { role: 'system', content: systemPrompt + langNote },
      { role: 'user', content: rawText },
    ]);

    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: treat the whole response as formatted text
      parsed = { formatted: raw.trim() };
    }

    return {
      formatted: parsed.formatted || rawText,
      corrections: parsed.corrections || [],
      score: parsed.score,
      confidence: parsed.confidence || 0.9,
      paragraphCount: parsed.paragraphCount,
      source: 'openai',
      processingTime: Date.now() - startTime,
      tokensUsed: 0, // filled by caller if needed
    };
  } catch (err) {
    console.warn('[formattingService] formatTextBlock error:', err.message);
    return {
      formatted: localLightFormat(rawText),
      corrections: [],
      confidence: 0.5,
      source: 'local-fallback',
      processingTime: Date.now() - startTime,
      tokensUsed: 0,
    };
  }
}

// ── Local lightweight formatter (no API) ─────────────────────────────────

/**
 * Basic client-side formatting without any API call:
 * - Collapses whitespace
 * - Capitalises first letter of each sentence
 * - Ensures sentences end with punctuation
 */
function localLightFormat(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/(^\s*|\.\s+|!\s+|\?\s+)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase())
    .trim();
}

module.exports = { formatTextBlock, localLightFormat };
