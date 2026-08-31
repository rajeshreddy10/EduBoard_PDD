'use client';

export interface BoardContent {
  strokes?: any[];
  textBoxes?: { text: string; x: number; y: number }[];
  stickyNotes?: { text: string; x: number; y: number }[];
  recognizedWords?: { text: string; x: number; y: number }[];
  importedFiles?: { type: string; name: string; content?: string }[];
}

export interface GeneratedNotes {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  questions: string[];
  detailedNotes: string;
  categories?: string[];
  tags?: string[];
}

export interface MeetingMinutes {
  title: string;
  date: string;
  attendees: string[];
  agenda: string[];
  discussion: string;
  decisions: string[];
  actionItems: { task: string; assignee?: string; priority: 'high' | 'medium' | 'low' }[];
  nextSteps: string[];
  notes: string;
}

export interface StudyNotes {
  subject: string;
  topic: string;
  summary: string;
  keyConcepts: { term: string; definition: string }[];
  formulas?: string[];
  examples: string[];
  practiceQuestions: string[];
  flashcards: { front: string; back: string }[];
}

export type AINotesListener = (event: string, data?: any) => void;

export class AINotesMaker {
  private listeners: Set<AINotesListener> = new Set();

  subscribe(listener: AINotesListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: string, data?: any) {
    this.listeners.forEach(l => l(event, data));
  }

  private extractText(content: BoardContent): string {
    const parts: string[] = [];
    if (content.textBoxes?.length) {
      parts.push(...content.textBoxes.map(tb => tb.text));
    }
    if (content.stickyNotes?.length) {
      parts.push(...content.stickyNotes.map(sn => sn.text));
    }
    if (content.recognizedWords?.length) {
      parts.push(content.recognizedWords.map(w => w.text).join(' '));
    }
    if (content.importedFiles?.length) {
      parts.push(...content.importedFiles
        .filter(f => f.content)
        .map(f => `[${f.name}]: ${f.content}`)
      );
    }
    return parts.join('\n\n').trim();
  }

  async generateSummary(content: BoardContent): Promise<GeneratedNotes> {
    this.notify('generating', { type: 'summary' });
    const text = this.extractText(content);
    const title = this.generateTitle(text);
    const sentences = this.splitSentences(text);
    const paragraphs = text.split('\n').filter(p => p.trim().length > 0);

    const keyPoints = this.extractKeyPoints(text);
    const summary = this.createSummary(sentences, 3);
    const actionItems = this.extractActionItems(text);
    const questions = this.extractQuestions(text);
    const categories = this.categorizeContent(text);

    const result: GeneratedNotes = {
      title,
      summary,
      keyPoints,
      actionItems,
      questions,
      detailedNotes: this.formatDetailedNotes(paragraphs, keyPoints),
      categories,
      tags: this.extractTags(text),
    };

    this.notify('complete', result);
    return result;
  }

  async generateMeetingMinutes(content: BoardContent): Promise<MeetingMinutes> {
    this.notify('generating', { type: 'meeting-minutes' });
    const text = this.extractText(content);
    const sentences = this.splitSentences(text);

    const decisions = sentences.filter(s =>
      /decided|agreed|concluded|resolved|approved|confirmed|finalized/i.test(s)
    );
    const actionItems = sentences.filter(s =>
      /will|need to|should|must|action|task|assign|responsible|deadline|by\s+\w+/i.test(s)
    );
    const agenda = sentences.filter(s =>
      /agenda|topic|discuss|session|meeting\s+(about|on|for)|purpose|objective|goal/i.test(s)
    );

    const minutes: MeetingMinutes = {
      title: `${this.generateTitle(text)} - Meeting Minutes`,
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      attendees: this.extractAttendees(text),
      agenda: agenda.length > 0 ? agenda : ['General discussion'],
      discussion: this.createSummary(sentences, 2),
      decisions: decisions.map(d => d.replace(/^(we\s+)?(have\s+)?/i, '').trim()),
      actionItems: actionItems.map(a => ({
        task: a.replace(/^(we\s+)?/i, '').trim(),
        priority: a.match(/urgent|immediately|asap|critical|important/i) ? 'high' as const : 'medium' as const,
      })),
      nextSteps: this.extractNextSteps(text),
      notes: text.substring(0, 1000),
    };

    this.notify('complete', minutes);
    return minutes;
  }

  async generateStudyNotes(content: BoardContent, subject?: string, topic?: string): Promise<StudyNotes> {
    this.notify('generating', { type: 'study-notes' });
    const text = this.extractText(content);

    const keyConcepts = this.extractKeyConcepts(text);
    const examples = this.extractExamples(text);
    const practiceQuestions = this.generatePracticeQuestions(text);

    const notes: StudyNotes = {
      subject: subject || this.detectSubject(text),
      topic: topic || this.generateTitle(text),
      summary: this.createSummary(this.splitSentences(text), 2),
      keyConcepts,
      examples,
      practiceQuestions,
      flashcards: this.generateFlashcards(keyConcepts, text),
    };

    this.notify('complete', notes);
    return notes;
  }

  private generateTitle(text: string): string {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return 'Untitled Notes';
    const firstLine = lines[0].trim();
    if (firstLine.length < 80) return firstLine;
    return firstLine.substring(0, 77) + '...';
  }

  private splitSentences(text: string): string[] {
    return text.match(/[^.!?\n]+[.!?]*/g)?.map(s => s.trim()).filter(s => s.length > 5) || [];
  }

  private createSummary(sentences: string[], count: number): string {
    if (sentences.length === 0) return 'No content to summarize.';
    const scored = sentences.map(s => ({
      sentence: s,
      score: this.scoreSentenceImportance(s),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.min(count, scored.length))
      .map(s => s.sentence)
      .join(' ');
  }

  private scoreSentenceImportance(sentence: string): number {
    let score = 0;
    const important = /key|important|significant|main|primary|critical|essential|fundamental|core|vital|major/i;
    const concluding = /therefore|thus|hence|consequently|in conclusion|overall|in summary|as a result/i;
    const defined = /is a|refers to|defined as|means that|involves|consists of|comprises|includes/i;
    if (important.test(sentence)) score += 3;
    if (concluding.test(sentence)) score += 2;
    if (defined.test(sentence)) score += 2;
    if (sentence.startsWith('#')) score += 2;
    if (sentence.includes(':')) score += 1;
    if (sentence.length > 80) score += 1;
    if (sentence.length < 20) score -= 1;
    return score;
  }

  private extractKeyPoints(text: string): string[] {
    const sentences = this.splitSentences(text);
    const points: string[] = [];

    for (const s of sentences) {
      if (/^(key|important|note:|remember:|main|critical|core|essential|fundamental)/i.test(s.trim())) {
        points.push(s.trim().replace(/^(key|important|note:|remember:|main|critical|core|essential|fundamental):?\s*/i, ''));
      }
    }

    const bulletPoints = text.match(/^[•\-*]\s*.+$/gm);
    if (bulletPoints) {
      points.push(...bulletPoints.map(b => b.replace(/^[•\-*]\s*/, '')));
    }

    const numberedPoints = text.match(/^\d+[.)]\s*.+$/gm);
    if (numberedPoints) {
      points.push(...numberedPoints.map(n => n.replace(/^\d+[.)]\s*/, '')));
    }

    if (points.length === 0) {
      const sorted = sentences.map(s => ({ sentence: s, score: this.scoreSentenceImportance(s) }))
        .sort((a, b) => b.score - a.score);
      points.push(...sorted.slice(0, 5).map(s => s.sentence));
    }

    return [...new Set(points)].slice(0, 10);
  }

  private extractActionItems(text: string): string[] {
    const items: string[] = [];
    const patterns = [
      /(?:action|task|todo|to-do|to do)\s*:?\s*(.+)/gi,
      /(?:need|must|should|will|have to)\s+(.+?)(?:\.|$)/gi,
      /(?:assign|responsible|owner)\s*:?\s*(.+)/gi,
      /deadline\s*:?\s*(.+)/gi,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        items.push(match[1].trim());
      }
    }
    return [...new Set(items)].slice(0, 10);
  }

  private extractQuestions(text: string): string[] {
    return text.split('\n')
      .filter(l => l.trim().endsWith('?'))
      .map(l => l.trim())
      .slice(0, 8);
  }

  private extractAttendees(text: string): string[] {
    const attendees: string[] = [];
    const patterns = [
      /(?:attendees?|participants?|present|members?)\s*:?\s*([^\n]+)/gi,
      /(?:with|joined by|featuring)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const names = match[1].split(/[,;]/).map((n: string) => n.trim());
        attendees.push(...names.filter((n: string) => n.length > 1));
      }
    }
    return [...new Set(attendees)].slice(0, 20);
  }

  private extractNextSteps(text: string): string[] {
    const steps: string[] = [];
    const patterns = [
      /(?:next steps?|follow.up|future work|upcoming|planning to)\s*:?\s*([^\n]+)/gi,
      /(?:will|going to|plan to|schedule)\s+(.+?)(?:\.|$)/gi,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        steps.push(match[1].trim());
      }
    }
    return [...new Set(steps)].slice(0, 5);
  }

  private extractKeyConcepts(text: string): { term: string; definition: string }[] {
    const concepts: { term: string; definition: string }[] = [];
    const definitionPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is a|refers to|means|defined as|represents|involves|describes)\s+(.+?)(?:\.|$)/g;
    let match;
    while ((match = definitionPattern.exec(text)) !== null) {
      concepts.push({ term: match[1].trim(), definition: match[2].trim() });
    }
    if (concepts.length === 0) {
      const words = text.split(/\s+/).filter(w => w.length > 6);
      const unique = [...new Set(words)].slice(0, 5);
      concepts.push(...unique.map(w => ({ term: w, definition: `Key concept related to: ${text.substring(0, 100)}` })));
    }
    return concepts.slice(0, 10);
  }

  private extractExamples(text: string): string[] {
    const examples: string[] = [];
    const patterns = [
      /(?:example|for instance|for example|e\.g\.|such as|like)\s*:?\s*([^\n]+)/gi,
      /^Example\s*\d*:?\s*(.+)$/gim,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        examples.push(match[1].trim());
      }
    }
    return examples.slice(0, 5);
  }

  private generatePracticeQuestions(text: string): string[] {
    const questions: string[] = [];
    const sentences = this.splitSentences(text);
    for (let i = 0; i < Math.min(5, sentences.length); i++) {
      const s = sentences[i];
      if (s.includes(' is ') || s.includes(' are ') || s.includes(' was ')) {
        questions.push(`What ${s.replace(/^(.*?)\s+(is|are|was|were)\s+/, 'is ')}?`);
      } else if (s.length > 20) {
        questions.push(`Explain: ${s.substring(0, 50)}...`);
      }
    }
    return questions;
  }

  private generateFlashcards(
    concepts: { term: string; definition: string }[],
    text: string
  ): { front: string; back: string }[] {
    const flashcards: { front: string; back: string }[] = concepts.map(c => ({
      front: c.term,
      back: c.definition,
    }));
    if (flashcards.length < 3) {
      const sentences = this.splitSentences(text);
      for (const s of sentences.slice(0, 5)) {
        if (s.includes(' is ')) {
          const parts = s.split(/\s+is\s+/);
          if (parts.length >= 2) {
            flashcards.push({ front: parts[0].trim(), back: parts.slice(1).join(' is ').trim() });
          }
        }
      }
    }
    return flashcards.slice(0, 10);
  }

  private categorizeContent(text: string): string[] {
    const categories: string[] = [];
    const keywords: Record<string, string[]> = {
      'Technology': ['software', 'hardware', 'computer', 'code', 'programming', 'algorithm', 'data', 'api', 'web', 'app'],
      'Science': ['experiment', 'hypothesis', 'theory', 'lab', 'research', 'study', 'analysis', 'observation'],
      'Mathematics': ['equation', 'formula', 'calculation', 'theorem', 'proof', 'geometry', 'algebra', 'calculus'],
      'Business': ['revenue', 'profit', 'strategy', 'market', 'customer', 'product', 'sales', 'growth'],
      'Education': ['lesson', 'course', 'curriculum', 'student', 'teacher', 'class', 'lecture', 'assignment'],
      'Design': ['ui', 'ux', 'design', 'interface', 'layout', 'typography', 'color', 'style'],
    };
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(w => text.toLowerCase().includes(w))) {
        categories.push(category);
      }
    }
    return categories.length > 0 ? categories : ['General'];
  }

  private extractTags(text: string): string[] {
    const words = text.split(/\s+/)
      .map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(w => w.length > 4 && w[0] === w[0].toUpperCase());
    return [...new Set(words)].slice(0, 8);
  }

  private formatDetailedNotes(paragraphs: string[], keyPoints: string[]): string {
    let notes = '';
    if (keyPoints.length > 0) {
      notes += '## Key Points\n\n';
      notes += keyPoints.map(kp => `- ${kp}\n`).join('');
      notes += '\n';
    }
    if (paragraphs.length > 0) {
      notes += '## Detailed Notes\n\n';
      notes += paragraphs.join('\n\n');
    }
    return notes;
  }

  private detectSubject(text: string): string {
    const subjects: Record<string, string[]> = {
      'Computer Science': ['algorithm', 'programming', 'software', 'code', 'data structure', 'database', 'network'],
      'Mathematics': ['equation', 'theorem', 'proof', 'integral', 'derivative', 'matrix', 'vector'],
      'Physics': ['force', 'energy', 'motion', 'velocity', 'acceleration', 'quantum', 'wave'],
      'Chemistry': ['element', 'compound', 'reaction', 'molecule', 'atom', 'bond', 'acid'],
      'Biology': ['cell', 'dna', 'organism', 'evolution', 'species', 'gene', 'protein'],
      'Business': ['marketing', 'finance', 'management', 'strategy', 'economics', 'accounting'],
    };
    for (const [subject, keywords] of Object.entries(subjects)) {
      if (keywords.some(k => text.toLowerCase().includes(k))) return subject;
    }
    return 'General';
  }

  exportNotes(notes: GeneratedNotes, format: 'txt' | 'md' | 'json'): string {
    switch (format) {
      case 'txt':
        return this.exportTxt(notes);
      case 'md':
        return this.exportMarkdown(notes);
      case 'json':
        return JSON.stringify(notes, null, 2);
    }
  }

  private exportTxt(notes: GeneratedNotes): string {
    let output = `${notes.title}\n${'='.repeat(notes.title.length)}\n\n`;
    output += `SUMMARY\n${'-'.repeat(40)}\n${notes.summary}\n\n`;
    output += `KEY POINTS\n${'-'.repeat(40)}\n`;
    notes.keyPoints.forEach((kp, i) => { output += `${i + 1}. ${kp}\n`; });
    output += '\n';
    if (notes.actionItems.length > 0) {
      output += `ACTION ITEMS\n${'-'.repeat(40)}\n`;
      notes.actionItems.forEach((ai, i) => { output += `${i + 1}. ${ai}\n`; });
      output += '\n';
    }
    return output;
  }

  private exportMarkdown(notes: GeneratedNotes): string {
    let output = `# ${notes.title}\n\n`;
    output += `## Summary\n\n${notes.summary}\n\n`;
    output += `## Key Points\n\n`;
    notes.keyPoints.forEach(kp => { output += `- ${kp}\n`; });
    output += '\n';
    if (notes.actionItems.length > 0) {
      output += `## Action Items\n\n`;
      notes.actionItems.forEach(ai => { output += `- [ ] ${ai}\n`; });
      output += '\n';
    }
    if (notes.questions.length > 0) {
      output += `## Questions\n\n`;
      notes.questions.forEach(q => { output += `- ${q}\n`; });
      output += '\n';
    }
    output += `## Detailed Notes\n\n${notes.detailedNotes}\n\n`;
    if (notes.tags && notes.tags.length > 0) {
      output += `**Tags:** ${notes.tags.map(t => `\`${t}\``).join(', ')}\n`;
    }
    return output;
  }

  downloadNotes(notes: GeneratedNotes, format: 'txt' | 'md' | 'json') {
    const content = this.exportNotes(notes, format);
    const mimeTypes = { txt: 'text/plain', md: 'text/markdown', json: 'application/json' };
    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notes.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const aiNotesMaker = new AINotesMaker();
