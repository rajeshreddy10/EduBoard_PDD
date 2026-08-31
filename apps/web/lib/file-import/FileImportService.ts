'use client';

export interface ImportedFileData {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'docx' | 'ppt' | 'video' | 'audio' | 'excel' | 'text';
  mimeType: string;
  size: number;
  dataUrl?: string;
  textContent?: string;
  pages?: string[];
  error?: string;
}

export type FileImportListener = (event: string, data?: any) => void;

export class FileImportService {
  private listeners: Set<FileImportListener> = new Set();

  subscribe(listener: FileImportListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: string, data?: any) {
    this.listeners.forEach(l => l(event, data));
  }

  getAcceptedTypes(): Record<string, string[]> {
    return {
      image: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'],
      pdf: ['application/pdf'],
      docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
      ppt: ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'],
      video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'],
      excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'],
      text: ['text/plain', 'text/markdown', 'application/json', 'text/html', 'text/css', 'text/javascript', 'application/xml', 'text/xml'],
    };
  }

  getAllAcceptedTypes(): string {
    return Object.values(this.getAcceptedTypes()).flat().join(',');
  }

  getTypeFromMime(mimeType: string): ImportedFileData['type'] {
    for (const [type, mimes] of Object.entries(this.getAcceptedTypes())) {
      if (mimes.includes(mimeType)) return type as ImportedFileData['type'];
    }
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'ppt';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'excel';
    return 'text';
  }

  async importFile(file: File): Promise<ImportedFileData> {
    this.notify('importStarted', { name: file.name, size: file.size, type: file.type });

    const fileType = this.getTypeFromMime(file.type);
    const fileData: ImportedFileData = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: file.name,
      type: fileType,
      mimeType: file.type,
      size: file.size,
    };

    try {
      if (file.type.startsWith('image/') || fileType === 'image') {
        fileData.dataUrl = await this.readAsDataURL(file);
      } else if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        fileData.dataUrl = URL.createObjectURL(file);
      } else if (file.type === 'application/pdf' || fileType === 'pdf') {
        fileData.dataUrl = await this.readAsDataURL(file);
        fileData.textContent = await this.extractPDFText(file);
      } else if (file.type.includes('word') || file.type.includes('document') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        fileData.textContent = await this.extractDocxText(file);
      } else if (file.type.includes('presentation') || file.type.includes('powerpoint') || file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
        const pptResult = await this.extractPptxSlides(file);
        fileData.textContent = pptResult.textContent;
        fileData.pages = pptResult.pages;
      } else if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
        fileData.textContent = await this.extractExcelText(file);
      } else {
        fileData.textContent = await this.readAsText(file);
      }

      this.notify('importComplete', fileData);
      return fileData;
    } catch (err: any) {
      fileData.error = err.message;
      this.notify('importError', { name: file.name, error: err.message });
      return fileData;
    }
  }

  private readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  private readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file buffer'));
      reader.readAsArrayBuffer(file);
    });
  }

  private readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  }

  private async extractPDFText(file: File): Promise<string> {
    try {
      const buffer = await this.readAsArrayBuffer(file);
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      const raw = textDecoder.decode(buffer);
      // Extract text streams from raw PDF content
      const textMatches = raw.match(/\(([^)]+)\)\s*Tj/g) || raw.match(/\[([^\]]+)\]\s*TJ/g);
      if (textMatches && textMatches.length > 0) {
        const extracted = textMatches.map(m => m.replace(/[\(\)\[\]TjTJ]/g, '')).join(' ');
        if (extracted.trim().length > 10) {
          return `Document Content: ${file.name}\n\n${extracted.substring(0, 4000)}`;
        }
      }
    } catch {}
    return `Document: ${file.name}\n\n[PDF document loaded successfully. Visual overlay ready.]`;
  }

  private async extractDocxText(file: File): Promise<string> {
    try {
      const buffer = await this.readAsArrayBuffer(file);
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      if (result.value && result.value.trim().length > 0) {
        return `Document: ${file.name}\n\n${result.value.trim()}`;
      }
    } catch {}
    // Fallback parser if mammoth module fails
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);
      const docXml = await zip.file('word/document.xml')?.async('text');
      if (docXml) {
        const cleanText = docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        return `Document: ${file.name}\n\n${cleanText}`;
      }
    } catch {}
    const text = await this.readAsText(file);
    const cleaned = text.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
    return `Document: ${file.name}\n\n${cleaned.substring(0, 4000)}`;
  }

  private async extractPptxSlides(file: File): Promise<{ textContent: string; pages: string[] }> {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);
      const slideFileKeys = Object.keys(zip.files)
        .filter(f => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
          const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
          return numA - numB;
        });

      const pages: string[] = [];
      for (let i = 0; i < slideFileKeys.length; i++) {
        const slideXml = await zip.file(slideFileKeys[i])?.async('text');
        if (slideXml) {
          const textMatches = slideXml.match(/<a:t[^>]*>(.*?)<\/a:t>/g);
          let slideText = '';
          if (textMatches && textMatches.length > 0) {
            slideText = textMatches.map(m => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).join('\n');
          } else {
            slideText = slideXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
          pages.push(slideText.trim() || `[Slide ${i + 1} Content]`);
        }
      }

      if (pages.length > 0) {
        return {
          textContent: `Presentation: ${file.name}\n\n${pages.map((p, idx) => `--- Slide ${idx + 1} ---\n${p}`).join('\n\n')}`,
          pages
        };
      }
    } catch {}

    const text = await this.readAsText(file);
    const cleaned = text.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      textContent: `Presentation: ${file.name}\n\n${cleaned.substring(0, 4000)}`,
      pages: [cleaned.substring(0, 4000) || '[Presentation Content Loaded]']
    };
  }

  private async extractExcelText(file: File): Promise<string> {
    const text = await this.readAsText(file);
    const cleaned = text.replace(/[^\x20-\x7E\n,;\t]/g, ' ').replace(/\s+/g, ' ').trim();
    return `Spreadsheet: ${file.name}\n\n${cleaned.substring(0, 4000)}`;
  }

  createFileInput(accept?: string, multiple?: boolean): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept || this.getAllAcceptedTypes();
      input.multiple = multiple || false;
      input.onchange = () => {
        const files = Array.from(input.files || []);
        resolve(files);
        input.remove();
      };
      input.click();
    });
  }
}

export const fileImportService = new FileImportService();

