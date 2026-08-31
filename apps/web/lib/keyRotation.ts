/**
 * API Key Rotation Manager & Failover Helper
 * Provides seamless zero-downtime key rotation for Firebase & AI Service API keys.
 */

export interface KeyRotationStatus {
  service: string;
  isUsingPrimary: boolean;
  isUsingFallback: boolean;
  keyConfigured: boolean;
  warnings: string[];
}

/**
 * Resolves active Firebase Web API key supporting primary and fallback keys for zero-downtime key rotation.
 */
export function getFirebaseApiKey(): string {
  const primaryKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const secondaryKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY_SECONDARY?.trim();
  const fallbackKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY_FALLBACK?.trim();

  // 1. Prefer Primary Key if configured and valid
  if (primaryKey && primaryKey !== 'your-firebase-api-key' && primaryKey.length > 10) {
    return primaryKey;
  }

  // 2. Fall back to Secondary or Rotation Fallback Key during rotation window
  if (secondaryKey && secondaryKey.length > 10) {
    console.warn('[KeyRotation] Primary Firebase API Key unconfigured or rotating. Using Secondary Key.');
    return secondaryKey;
  }

  if (fallbackKey && fallbackKey.length > 10) {
    console.warn('[KeyRotation] Primary Firebase API Key unconfigured or rotating. Using Fallback Key.');
    return fallbackKey;
  }

  return primaryKey || '';
}

/**
 * Resolves AI provider API key supporting rotation fallback.
 */
export function getAiApiKey(provider: 'gemini' | 'openai'): string {
  if (provider === 'gemini') {
    const primary = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const fallback = process.env.GEMINI_API_KEY_SECONDARY || process.env.NEXT_PUBLIC_GEMINI_API_KEY_FALLBACK;
    return (primary && primary !== 'your_key_here') ? primary : (fallback || primary || '');
  }

  if (provider === 'openai') {
    const primary = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const fallback = process.env.OPENAI_API_KEY_SECONDARY || process.env.NEXT_PUBLIC_OPENAI_API_KEY_FALLBACK;
    return (primary && primary !== 'your_openai_key_here') ? primary : (fallback || primary || '');
  }

  return '';
}

/**
 * Returns key rotation diagnostics for admin monitoring.
 */
export function getKeyRotationDiagnostics(): KeyRotationStatus[] {
  const primaryFb = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const fallbackFb = process.env.NEXT_PUBLIC_FIREBASE_API_KEY_FALLBACK || process.env.NEXT_PUBLIC_FIREBASE_API_KEY_SECONDARY;

  const firebaseStatus: KeyRotationStatus = {
    service: 'Firebase Client',
    isUsingPrimary: !!(primaryFb && primaryFb !== 'your-firebase-api-key'),
    isUsingFallback: !primaryFb && !!fallbackFb,
    keyConfigured: !!(primaryFb || fallbackFb),
    warnings: []
  };

  if (!firebaseStatus.keyConfigured) {
    firebaseStatus.warnings.push('No Firebase API Key configured. Features requiring Cloud Auth/Firestore will run in offline demo mode.');
  } else if (firebaseStatus.isUsingFallback) {
    firebaseStatus.warnings.push('Active rotation: Using fallback Firebase API Key.');
  }

  return [firebaseStatus];
}
