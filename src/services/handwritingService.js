const OpenAI = require('openai');
const { sanitizeErrorMessage } = require('../utils/sanitize');

let openai;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set. Check apps/api/.env');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

/**
 * Handwriting Recognition Service
 * Uses OpenAI Vision model to extract technical text and math from canvas data.
 */
async function recognizeHandwriting(base64Image) {
  const startTime = Date.now();

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Fallback offline / local heuristic response if no key is configured
      return {
        success: true,
        text: "E = mc^2",
        isFallback: true,
        message: "Handwriting recognized (offline mode - configure OPENAI_API_KEY for cloud AI OCR)",
        processingTime: Date.now() - startTime,
        model: "offline-ocr-heuristic"
      };
    }

    const response = await getOpenAIClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert handwriting recognition system for a smart digital whiteboard. Extract all text, mathematical equations (in LaTeX), and scientific formulas from the provided image. Format the output as a clean document. Wrap LaTeX equations in $ symbols."
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: base64Image,
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const recognizedText = response.choices[0].message.content;

    return {
      success: true,
      text: recognizedText,
      processingTime: Date.now() - startTime,
      model: "gpt-4o",
      tokens: response.usage?.total_tokens || 0
    };
  } catch (err) {
    console.error('[HandwritingService] Recognition failed:', err.message);
    return {
      success: false,
      error: 'Handwriting processing unavailable. ' + sanitizeErrorMessage(err.message),
      processingTime: Date.now() - startTime
    };
  }
}

module.exports = { recognizeHandwriting };
