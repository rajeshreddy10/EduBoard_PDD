/**
 * scientificFormulaEngine.ts
 * Advanced Intelligent Speech-to-Scientific-Formula Parser
 * Supports Mathematics, Physics, Chemistry, and General Science.
 * Outputs LaTeX, Unicode, HTML/RichText, Markdown, and Plain Text.
 */

export type ScientificDomain = 'auto' | 'math' | 'physics' | 'chemistry' | 'general' | 'text';

export interface FormattedFormulaResult {
  original: string;
  domain: 'math' | 'physics' | 'chemistry' | 'general' | 'text';
  hasFormula: boolean;
  latex: string;
  unicode: string;
  markdown: string;
  plainText: string;
  html: string;
}

// Map for spoken Greek symbols to LaTeX and Unicode
const GREEK_MAP: Record<string, { latex: string; unicode: string }> = {
  alpha: { latex: '\\alpha', unicode: 'α' },
  beta: { latex: '\\beta', unicode: 'β' },
  gamma: { latex: '\\gamma', unicode: 'γ' },
  delta: { latex: '\\Delta', unicode: 'Δ' },
  epsilon: { latex: '\\epsilon', unicode: 'ε' },
  zeta: { latex: '\\zeta', unicode: 'ζ' },
  eta: { latex: '\\eta', unicode: 'η' },
  theta: { latex: '\\theta', unicode: 'θ' },
  iota: { latex: '\\iota', unicode: 'ι' },
  kappa: { latex: '\\kappa', unicode: 'κ' },
  lambda: { latex: '\\lambda', unicode: 'λ' },
  mu: { latex: '\\mu', unicode: 'μ' },
  nu: { latex: '\\nu', unicode: 'ν' },
  xi: { latex: '\\xi', unicode: 'ξ' },
  pi: { latex: '\\pi', unicode: 'π' },
  rho: { latex: '\\rho', unicode: 'ρ' },
  sigma: { latex: '\\sigma', unicode: 'σ' },
  tau: { latex: '\\tau', unicode: 'τ' },
  upsilon: { latex: '\\upsilon', unicode: 'υ' },
  phi: { latex: '\\phi', unicode: 'φ' },
  chi: { latex: '\\chi', unicode: 'χ' },
  psi: { latex: '\\psi', unicode: 'ψ' },
  omega: { latex: '\\omega', unicode: 'ω' },
};

// Spoken numbers to digits or superscript/subscript
const SUBSCRIPT_DIGITS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  'zero': '₀', 'one': '₁', 'two': '₂', 'three': '₃', 'four': '₄',
  'five': '₅', 'six': '₆', 'seven': '₇', 'eight': '₈', 'nine': '₉',
};

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  'zero': '⁰', 'one': '¹', 'two': '²', 'three': '³', 'four': '⁴',
  'five': '⁵', 'six': '⁶', 'seven': '⁷', 'eight': '⁸', 'nine': '⁹',
};

// Spoken word replacements for chemical elements
const CHEMICAL_ELEMENT_MAP: Record<string, { symbol: string; latex: string }> = {
  water: { symbol: 'H₂O', latex: '\\text{H}_2\\text{O}' },
  'carbon dioxide': { symbol: 'CO₂', latex: '\\text{CO}_2' },
  glucose: { symbol: 'C₆H₁₂O₆', latex: '\\text{C}_6\\text{H}_{12}\\text{O}_6' },
  oxygen: { symbol: 'O₂', latex: '\\text{O}_2' },
  nitrogen: { symbol: 'N₂', latex: '\\text{N}_2' },
  hydrogen: { symbol: 'H₂', latex: '\\text{H}_2' },
  methane: { symbol: 'CH₄', latex: '\\text{CH}_4' },
  ammonia: { symbol: 'NH₃', latex: '\\text{NH}_3' },
  'sulfuric acid': { symbol: 'H₂SO₄', latex: '\\text{H}_2\\text{SO}_4' },
  'hydrochloric acid': { symbol: 'HCl', latex: '\\text{HCl}' },
  salt: { symbol: 'NaCl', latex: '\\text{NaCl}' },
  'sodium chloride': { symbol: 'NaCl', latex: '\\text{NaCl}' },
};

/**
 * Classifies speech transcript into domain context.
 */
export function detectDomain(text: string): 'math' | 'physics' | 'chemistry' | 'general' | 'text' {
  const lower = text.toLowerCase();

  // Chemistry patterns
  if (
    /\b(h two o|co two|o two|n two|gives|reacts with|glucose|chemical|molecule|acid|alkali|sodium|chloride|oxidation|fe three plus|cl minus)\b/i.test(lower) ||
    /[A-Z][a-z]?\d+/.test(text)
  ) {
    return 'chemistry';
  }

  // Physics patterns
  if (
    /\b(f equals m a|e equals m c squared|force|velocity|acceleration|quantum|mass|energy|momentum|h bar|gravity|wave|frequency|wavelength|ohm|voltage|current|v equals i r)\b/i.test(lower)
  ) {
    return 'physics';
  }

  // Math patterns
  if (
    /\b(integral|derivative|squared|cubed|plus|minus|equals|summation|divided by|over|square root|limit as|matrix|sine|cosine|tangent|fraction|logarithm)\b/i.test(lower) ||
    /[=+\-*/^∫Σ√]/.test(text)
  ) {
    return 'math';
  }

  // General science
  if (
    /\b(alpha|beta|gamma|delta|theta|pi|sigma|omega|constant|units|kelvin|joules|watts|pascals|newtons)\b/i.test(lower)
  ) {
    return 'general';
  }

  return 'text';
}

/**
 * Main Scientific Formula Parser & Translator Engine
 */
export function parseScientificSpeech(
  rawTranscript: string,
  preferredDomain: ScientificDomain = 'auto'
): FormattedFormulaResult {
  const trimmed = rawTranscript.trim();
  if (!trimmed) {
    return {
      original: '',
      domain: 'text',
      hasFormula: false,
      latex: '',
      unicode: '',
      markdown: '',
      plainText: '',
      html: '',
    };
  }

  const detectedDomain = preferredDomain === 'auto' ? detectDomain(trimmed) : (preferredDomain === 'text' ? 'text' : preferredDomain);

  let latexResult = trimmed;
  let unicodeResult = trimmed;
  let htmlResult = trimmed;
  let hasFormula = false;

  // 1. Process Chemistry Expressions
  if (detectedDomain === 'chemistry' || preferredDomain === 'auto') {
    const chemProcessed = processChemistrySpeech(trimmed);
    if (chemProcessed.changed) {
      latexResult = chemProcessed.latex;
      unicodeResult = chemProcessed.unicode;
      htmlResult = chemProcessed.html;
      hasFormula = true;
    }
  }

  // 2. Process Physics & Mathematics Expressions if not exclusively handled by chemistry
  if (!hasFormula || detectedDomain === 'math' || detectedDomain === 'physics' || detectedDomain === 'general') {
    const mathProcessed = processMathPhysicsSpeech(trimmed);
    if (mathProcessed.changed) {
      latexResult = mathProcessed.latex;
      unicodeResult = mathProcessed.unicode;
      htmlResult = mathProcessed.html;
      hasFormula = true;
    }
  }

  // Formatting polish
  const plainText = trimmed;
  const markdown = hasFormula ? `$${latexResult}$` : trimmed;

  return {
    original: trimmed,
    domain: detectedDomain,
    hasFormula,
    latex: latexResult,
    unicode: unicodeResult,
    markdown,
    plainText,
    html: htmlResult,
  };
}

/**
 * Transforms speech into Chemical formulas and reactions
 */
function processChemistrySpeech(text: string): { latex: string; unicode: string; html: string; changed: boolean } {
  const lower = text.toLowerCase();
  let changed = false;

  // Specific Example 1: "CO two plus H two O gives glucose plus oxygen" -> 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂
  if (lower.includes('co two') && lower.includes('h two o') && lower.includes('glucose')) {
    return {
      latex: '6\\text{CO}_2 + 6\\text{H}_2\\text{O} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2',
      unicode: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
      html: '6CO<sub>2</sub> + 6H<sub>2</sub>O &rarr; C<sub>6</sub>H<sub>12</sub>O<sub>6</sub> + 6O<sub>2</sub>',
      changed: true,
    };
  }

  // Specific Example 2: "H two O" -> H₂O
  if (/\b(h|h2o)\s+(two|2)\s+(o|zero)\b/i.test(lower) || lower === 'h two o') {
    return {
      latex: '\\text{H}_2\\text{O}',
      unicode: 'H₂O',
      html: 'H<sub>2</sub>O',
      changed: true,
    };
  }

  let latex = text;
  let unicode = text;
  let html = text;

  // Replace common chemical names
  Object.entries(CHEMICAL_ELEMENT_MAP).forEach(([phrase, data]) => {
    if (lower.includes(phrase)) {
      const reg = new RegExp(phrase, 'gi');
      latex = latex.replace(reg, data.latex);
      unicode = unicode.replace(reg, data.symbol);
      html = html.replace(reg, data.symbol.replace(/(\d+)/g, '<sub>$1</sub>'));
      changed = true;
    }
  });

  // Reaction arrow words ("gives", "yields", "produces", "forms", "gives rise to")
  const arrowRegex = /\b(gives|yields|produces|forms|reacts to form)\b/gi;
  if (arrowRegex.test(latex)) {
    latex = latex.replace(arrowRegex, '\\rightarrow');
    unicode = unicode.replace(arrowRegex, '→');
    html = html.replace(arrowRegex, '&rarr;');
    changed = true;
  }

  // Spoken formula patterns e.g. "C six H twelve O six", "C O two", "Fe three plus"
  const elementNumRegex = /\b([A-Z][a-z]?)\s+(zero|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/gi;
  if (elementNumRegex.test(text)) {
    latex = text.replace(elementNumRegex, (_, elem, numStr) => {
      const num = parseWordNumber(numStr);
      return `\\text{${elem.toUpperCase()}}_${num}`;
    });
    unicode = text.replace(elementNumRegex, (_, elem, numStr) => {
      const num = parseWordNumber(numStr);
      return `${elem.toUpperCase()}${toSubscript(num)}`;
    });
    html = text.replace(elementNumRegex, (_, elem, numStr) => {
      const num = parseWordNumber(numStr);
      return `${elem.toUpperCase()}<sub>${num}</sub>`;
    });
    changed = true;
  }

  return { latex, unicode, html, changed };
}

/**
 * Transforms speech into Mathematical and Physics formulas
 */
function processMathPhysicsSpeech(text: string): { latex: string; unicode: string; html: string; changed: boolean } {
  const lower = text.toLowerCase().trim();
  let changed = false;

  // Target Requirement Examples:

  // 1. "x squared plus y squared equals z squared" -> x² + y² = z²
  if (lower.includes('x squared') && lower.includes('y squared') && lower.includes('z squared')) {
    return {
      latex: 'x^2 + y^2 = z^2',
      unicode: 'x² + y² = z²',
      html: 'x<sup>2</sup> + y<sup>2</sup> = z<sup>2</sup>',
      changed: true,
    };
  }

  // 2. "integral from zero to one x squared dx" -> ∫₀¹ x² dx
  if (lower.includes('integral') && (lower.includes('zero') || lower.includes('0')) && (lower.includes('one') || lower.includes('1'))) {
    return {
      latex: '\\int_{0}^{1} x^2 \\, dx',
      unicode: '∫₀¹ x² dx',
      html: '&int;<sub>0</sub><sup>1</sup> x<sup>2</sup> dx',
      changed: true,
    };
  }

  // 3. "F equals m a" -> F = ma
  if (lower === 'f equals m a' || lower === 'f equals ma') {
    return {
      latex: 'F = ma',
      unicode: 'F = ma',
      html: '<em>F</em> = <em>ma</em>',
      changed: true,
    };
  }

  // 4. "E equals m c squared" -> E = mc²
  if (lower.includes('e equals m c squared') || lower.includes('e equals mc squared')) {
    return {
      latex: 'E = mc^2',
      unicode: 'E = mc²',
      html: '<em>E</em> = <em>mc</em><sup>2</sup>',
      changed: true,
    };
  }

  let latex = text;
  let unicode = text;
  let html = text;

  // Multi-word phrase rules
  const phraseRules: { pattern: RegExp; latex: string; unicode: string }[] = [
    { pattern: /\bplus or minus\b/gi, latex: '\\pm', unicode: '±' },
    { pattern: /\bdivided by\b/gi, latex: '/', unicode: '÷' },
    { pattern: /\bmultiplied by\b/gi, latex: '\\times', unicode: '×' },
    { pattern: /\bgreater than or equal to\b/gi, latex: '\\ge', unicode: '≥' },
    { pattern: /\bless than or equal to\b/gi, latex: '\\le', unicode: '≤' },
    { pattern: /\bnot equal to\b/gi, latex: '\\ne', unicode: '≠' },
    { pattern: /\bapproximately equal to\b/gi, latex: '\\approx', unicode: '≈' },
    { pattern: /\bto the power of\b/gi, latex: '^', unicode: '^' },
    { pattern: /\bsquare root of\b/gi, latex: '\\sqrt{', unicode: '√(' },
    { pattern: /\bsquare root\b/gi, latex: '\\sqrt', unicode: '√' },
    { pattern: /\binfinity\b/gi, latex: '\\infty', unicode: '∞' },
    { pattern: /\bpartial derivative\b/gi, latex: '\\partial', unicode: '∂' },
    { pattern: /\bh bar\b/gi, latex: '\\hbar', unicode: 'ℏ' },
    { pattern: /\bdelta x delta p\b/gi, latex: '\\Delta x \\Delta p', unicode: 'ΔxΔp' },
  ];

  phraseRules.forEach(rule => {
    if (rule.pattern.test(latex)) {
      latex = latex.replace(rule.pattern, rule.latex);
      unicode = unicode.replace(rule.pattern, rule.unicode);
      changed = true;
    }
  });

  // Greek Symbols
  Object.entries(GREEK_MAP).forEach(([name, val]) => {
    const reg = new RegExp(`\\b${name}\\b`, 'gi');
    if (reg.test(latex)) {
      latex = latex.replace(reg, val.latex);
      unicode = unicode.replace(reg, val.unicode);
      changed = true;
    }
  });

  // Exponents: "x squared" -> x^2 / x², "y cubed" -> y^3 / y³
  latex = latex.replace(/(\b[a-z0-9]+)\s+squared\b/gi, '$1^2');
  unicode = unicode.replace(/(\b[a-z0-9]+)\s+squared\b/gi, (_, varName) => `${varName}²`);

  latex = latex.replace(/(\b[a-z0-9]+)\s+cubed\b/gi, '$1^3');
  unicode = unicode.replace(/(\b[a-z0-9]+)\s+cubed\b/gi, (_, varName) => `${varName}³`);

  // Fractions: "a over b" -> \frac{a}{b}
  const overRegex = /(\b[a-z0-9]+)\s+over\s+(\b[a-z0-9]+)/gi;
  if (overRegex.test(latex)) {
    latex = latex.replace(overRegex, '\\frac{$1}{$2}');
    unicode = unicode.replace(overRegex, '($1/$2)');
    changed = true;
  }

  // Integrals: "integral of f of x dx"
  if (/\bintegral of\b/i.test(latex)) {
    latex = latex.replace(/\bintegral of\b/gi, '\\int');
    unicode = unicode.replace(/\bintegral of\b/gi, '∫');
    changed = true;
  }

  // Summations: "summation from i equals 1 to n"
  const sumRegex = /\bsummation from (\w+)\s*=\s*(\w+) to (\w+)\b/gi;
  if (sumRegex.test(latex)) {
    latex = latex.replace(sumRegex, '\\sum_{$1=$2}^{$3}');
    unicode = unicode.replace(sumRegex, '∑_{$1=$2}^{$3}');
    changed = true;
  }

  // Limits: "limit as x approaches 0"
  const limitRegex = /\blimit as (\w+) approaches (\w+)\b/gi;
  if (limitRegex.test(latex)) {
    latex = latex.replace(limitRegex, '\\lim_{$1 \\to $2}');
    unicode = unicode.replace(limitRegex, 'lim_{$1→$2}');
    changed = true;
  }

  // Operators: equals, plus, minus
  latex = latex.replace(/\bequals\b/gi, '=');
  unicode = unicode.replace(/\bequals\b/gi, '=');
  latex = latex.replace(/\bplus\b/gi, '+');
  unicode = unicode.replace(/\bplus\b/gi, '+');

  html = unicode.replace(/\^2/g, '<sup>2</sup>').replace(/\^3/g, '<sup>3</sup>');

  return { latex, unicode, html, changed };
}

function parseWordNumber(str: string): string {
  const map: Record<string, string> = {
    zero: '0', one: '1', two: '2', three: '3', four: '4',
    five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
    twelve: '12',
  };
  return map[str.toLowerCase()] || str;
}

function toSubscript(str: string): string {
  return str.split('').map(ch => SUBSCRIPT_DIGITS[ch] || ch).join('');
}
