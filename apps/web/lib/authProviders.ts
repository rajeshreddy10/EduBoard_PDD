'use client';

/**
 * authProviders.ts
 * Google Identity Services (GIS) helpers.
 * Credentials come from environment variables — set them in .env
 */

// ── Google Identity Services ─────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

/** Loads the GIS script dynamically (idempotent). */
export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).google?.accounts?.id) return resolve();

    const existing = document.getElementById('google-gis-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
}

/**
 * Opens the Google sign-in popup and resolves with the ID token credential.
 * Uses the newer GIS One-Tap / popup flow.
 */
export function signInWithGoogle(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) {
      return reject(new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured in .env'));
    }

    try {
      await loadGoogleScript();
    } catch {
      return reject(new Error('Failed to load Google Identity Services'));
    }

    const google = (window as any).google;
    if (!google?.accounts?.id) {
      return reject(new Error('Google Identity Services not available'));
    }

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: any) => {
        if (response.credential) {
          resolve(response.credential);
        } else {
          reject(new Error('Google sign-in was cancelled or failed'));
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Use the button-flow prompt
    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Prompt was blocked — fall back to renderButton approach via programmatic click
        reject(new Error('Google sign-in prompt was blocked. Please allow pop-ups for this site.'));
      }
    });
  });
}

/** Revoke Google session on logout */
export function revokeGoogleSession(): void {
  const google = (window as any).google;
  if (google?.accounts?.id) {
    google.accounts.id.disableAutoSelect();
  }
}
