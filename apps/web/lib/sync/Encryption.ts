export class Encryption {
  private crypto = typeof window !== 'undefined' ? window.crypto : null;

  async generateKey(): Promise<string> {
    if (!this.crypto) return this.fallbackKey();
    const key = await this.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const raw = await this.crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(raw);
  }

  async encrypt(data: string, key: string): Promise<string> {
    if (!this.crypto) return this.fallbackEncrypt(data, key);
    try {
      const iv = this.crypto.getRandomValues(new Uint8Array(12));
      const keyBuffer = await this.importKey(key);
      const encoded = new TextEncoder().encode(data);
      const encrypted = await this.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        keyBuffer,
        encoded
      );
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      return this.arrayBufferToBase64(combined.buffer);
    } catch {
      return this.fallbackEncrypt(data, key);
    }
  }

  async decrypt(encrypted: string, key: string): Promise<string> {
    if (!this.crypto) return this.fallbackDecrypt(encrypted, key);
    try {
      const combined = this.base64ToArrayBuffer(encrypted);
      const iv = new Uint8Array(combined.slice(0, 12));
      const data = new Uint8Array(combined.slice(12));
      const keyBuffer = await this.importKey(key);
      const decrypted = await this.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        keyBuffer,
        data
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      return this.fallbackDecrypt(encrypted, key);
    }
  }

  async hash(data: string): Promise<string> {
    if (!this.crypto) return this.fallbackHash(data);
    try {
      const encoded = new TextEncoder().encode(data);
      const hash = await this.crypto.subtle.digest('SHA-256', encoded);
      return this.arrayBufferToHex(hash);
    } catch {
      return this.fallbackHash(data);
    }
  }

  async getChecksum(data: any): Promise<string> {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return this.hash(str);
  }

  private async importKey(key: string): Promise<CryptoKey> {
    const raw = this.base64ToArrayBuffer(key);
    return this.crypto!.subtle.importKey(
      'raw', raw,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private fallbackKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private fallbackEncrypt(data: string, key: string): string {
    const xor = data.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
    return btoa(encodeURIComponent(xor));
  }

  private fallbackDecrypt(encrypted: string, key: string): string {
    try {
      const xor = decodeURIComponent(atob(encrypted));
      return xor.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
    } catch {
      return encrypted;
    }
  }

  private fallbackHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

export const encryption = new Encryption();
