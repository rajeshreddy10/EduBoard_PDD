// Client-side spell checker - TypeScript port of nlp_module/spell_checker.py
// Uses a built-in dictionary + Levenshtein distance for suggestions
// No backend or Python dependencies needed

const DICTIONARY = new Set([
  // Top 500 English words (subset for fast checking)
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with',
  'he','as','you','do','at','this','but','his','by','from','they','we','her','she','or',
  'an','will','my','one','all','would','there','their','what','so','up','out','if','about',
  'who','get','which','go','me','when','make','can','like','time','no','just','him','know',
  'take','people','into','year','your','good','some','could','them','see','other','than',
  'then','now','look','only','come','its','over','think','also','back','after','use','two',
  'how','our','work','first','well','way','even','new','want','because','any','these','give',
  'day','most','us','great','between','need','large','under','never','each','right','last',
  'own','old','off','turn','got','been','has','had','did','said','does','let','made','find',
  'here','thing','many','very','still','should','before','down','long','too','same','tell',
  'might','while','found','hand','high','keep','place','small','quite','being','end','such',
  'through','set','put','home','read','head','start','point','world','next','state','move',
  'help','system','show','much','part','where','must','every','line','around','try','write',
  'went','without','again','run','came','always','real','left','number','course','area',
  'water','word','once','second','late','against','side','boy','call','upon','war','house',
  'problem','open','close','best','better','land','play','kind','name','begin','began',
  'night','away','idea','enough','door','during','held','eye','along','sure','power','able',
  'money','face','seem','saw','stood','young','may','room','pay','hear','hard','change',
  'children','group','girl','woman','city','table','less','love','country','human','live',
  'school','ask','car','light','body','mind','bring','understand','letter','morning','young',
  'class','story','full','become','though','however','early','feel','nothing','public','already',
  'possible','result','across','form','given','order','study','several','different','often',
  'important','life','something','really','whole','person','fact','family','watch','case','book',
  'question','child','game','answer','remember','true','social','develop','learn','experience',
  'clear','business','inside','reach','market','sense','include','education','above','others',
  'interest','process','believe','information','design','company','mother','father','both',
  'level','usually','death','record','reason','create','follow','simple','action','history',
  'strong','language','job','toward','else','meet','free','continue','stand','field','rate',
  'local','remain','effort','natural','rather','report','plan','fall','half','age','color',
  'perhaps','hold','size','building','test','bit','pull','grow','deal','type','food','art',
  'law','hour','force','special','general','pass','stage','period','produce','health','offer',
  'figure','support','picture','data','model','provide','control','role','among','manage',
  'million','value','activity','describe','appear','material','together','quality','service',
  'technology','modern','computer','digital','software','application','program','project',
  'feature','update','version','system','network','security','performance','content','message',
  'board','team','gesture','writing','interface','canvas','tool','setting','profile','theme',
  'correct','spelling','grammar','error','check','auto','format','text','font','style',
  'highlight','align','bold','italic','underline','delete','save','export','share','create',
  'view','edit','manage','access','log','encrypt','privacy','notification','language','accuracy',
  'sensitivity','collaboration','dashboard','analytics','template','workspace','session',
  'hello','world','smart','quick','brown','fox','jumps','over','lazy','dog','sentence',
  'definitely','receive','accommodate','occurred','separate','necessary','occasion','recommend',
  'environment','government','tomorrow','beautiful','calendar','category','cemetery','conscience',
]);

// Common misspellings map for instant corrections
const COMMON_FIXES: Record<string, string> = {
  'teh': 'the', 'thier': 'their', 'recieve': 'receive', 'definately': 'definitely',
  'occured': 'occurred', 'seperate': 'separate', 'accomodate': 'accommodate',
  'neccessary': 'necessary', 'occassion': 'occasion', 'recomend': 'recommend',
  'enviroment': 'environment', 'goverment': 'government', 'tommorow': 'tomorrow',
  'beautifull': 'beautiful', 'calender': 'calendar', 'catagory': 'category',
  'cemetary': 'cemetery', 'concience': 'conscience', 'wrold': 'world',
  'hte': 'the', 'adn': 'and', 'thn': 'the', 'wiht': 'with', 'taht': 'that',
  'dont': "don't", 'cant': "can't", 'wont': "won't", 'isnt': "isn't",
  'doesnt': "doesn't", 'didnt': "didn't", 'shouldnt': "shouldn't",
  'couldnt': "couldn't", 'wouldnt': "wouldn't", 'im': "I'm", 'ive': "I've",
  'youre': "you're", 'theyre': "they're", 'weve': "we've",
  'speling': 'spelling', 'writng': 'writing', 'gestur': 'gesture',
  'sentance': 'sentence', 'quik': 'quick',
};

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function findSuggestions(word: string, maxDist = 2, maxResults = 5): string[] {
  const lower = word.toLowerCase();
  // Check common fixes first
  if (COMMON_FIXES[lower]) return [COMMON_FIXES[lower]];
  
  const scored: { word: string; dist: number }[] = [];
  DICTIONARY.forEach(dictWord => {
    if (Math.abs(dictWord.length - lower.length) > maxDist) return;
    const dist = levenshtein(lower, dictWord);
    if (dist <= maxDist && dist > 0) {
      scored.push({ word: dictWord, dist });
    }
  });
  scored.sort((a, b) => a.dist - b.dist);
  return scored.slice(0, maxResults).map(s => s.word);
}

export interface SpellError {
  word: string;
  position: number;
  suggestions: string[];
  bestSuggestion: string;
}

export interface SpellResult {
  originalText: string;
  correctedText: string;
  errors: SpellError[];
  errorCount: number;
}

export function checkSpelling(text: string): SpellResult {
  const words = text.match(/\b[a-zA-Z']+\b/g) || [];
  const errors: SpellError[] = [];
  let correctedText = text;

  for (const word of words) {
    const lower = word.toLowerCase();
    // Skip single chars, proper nouns starting with uppercase, and known words
    if (word.length <= 1) continue;
    if (DICTIONARY.has(lower)) continue;
    if (COMMON_FIXES[lower] || !DICTIONARY.has(lower)) {
      const suggestions = findSuggestions(word);
      if (suggestions.length > 0) {
        const best = suggestions[0];
        const pos = text.indexOf(word);
        errors.push({ word, position: pos, suggestions, bestSuggestion: best });
        // Apply correction
        correctedText = correctedText.replace(new RegExp(`\\b${word}\\b`, 'i'), best);
      }
    }
  }

  return { originalText: text, correctedText, errors, errorCount: errors.length };
}

// Grammar checking (rule-based, client-side)
export interface GrammarIssue {
  text: string;
  fix: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  position: number;
}

const GRAMMAR_RULES: { pattern: RegExp; fix: (m: RegExpMatchArray) => string; type: string; severity: 'high' | 'medium' | 'low' }[] = [
  { pattern: /\bme and (\w+)\b/gi, fix: (m) => `${m[1]} and I`, type: 'Subject pronoun', severity: 'high' },
  { pattern: /\btheir\s+(is|are|was|were|going|coming|doing)\b/gi, fix: (m) => `they're ${m[1]}`, type: 'Homophone', severity: 'high' },
  { pattern: /\byour\s+(welcome|right|wrong|going|coming|doing)\b/gi, fix: (m) => `you're ${m[1]}`, type: 'Homophone', severity: 'high' },
  { pattern: /\bits\s+(a|an|the|not|very|really|been|going)\b/gi, fix: (m) => `it's ${m[1]}`, type: 'Contraction', severity: 'medium' },
  { pattern: /\bi\s+(?=[a-z])/g, fix: () => 'I ', type: 'Capitalization', severity: 'low' },
  { pattern: /\balot\b/gi, fix: () => 'a lot', type: 'Spacing', severity: 'medium' },
  { pattern: /\bcould of\b/gi, fix: () => 'could have', type: 'Common error', severity: 'high' },
  { pattern: /\bshould of\b/gi, fix: () => 'should have', type: 'Common error', severity: 'high' },
  { pattern: /\bwould of\b/gi, fix: () => 'would have', type: 'Common error', severity: 'high' },
];

export function checkGrammar(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];
  for (const rule of GRAMMAR_RULES) {
    let match;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        text: match[0],
        fix: rule.fix(match),
        type: rule.type,
        severity: rule.severity,
        position: match.index,
      });
    }
  }
  return issues;
}

// Auto-correct: live correction as you type
export function autoCorrect(text: string): { text: string; applied: string[] } {
  let result = text;
  const applied: string[] = [];
  for (const [wrong, right] of Object.entries(COMMON_FIXES)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, right);
      applied.push(`${wrong} → ${right}`);
    }
  }
  return { text: result, applied };
}
