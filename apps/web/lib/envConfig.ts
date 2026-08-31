/**
 * Frontend Environment Configuration Validator & Health Monitor
 * Ensures all required environment variables are present and cleanly formatted.
 */

export interface EnvHealthStatus {
  isProductionReady: boolean;
  missingVars: string[];
  warnings: string[];
  environment: 'development' | 'production' | 'test';
}

export function validateEnvironment(): EnvHealthStatus {
  const env = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
  const missingVars: string[] = [];
  const warnings: string[] = [];

  const requiredClientVars = [
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ];

  const recommendedClientVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  ];

  requiredClientVars.forEach((v) => {
    if (!process.env[v]) {
      missingVars.push(v);
    }
  });

  recommendedClientVars.forEach((v) => {
    const val = process.env[v];
    if (!val || val.includes('your-') || val.includes('placeholder')) {
      warnings.push(`Environment variable ${v} is using fallback or placeholder value.`);
    }
  });

  const isProductionReady = missingVars.length === 0;

  return {
    isProductionReady,
    missingVars,
    warnings,
    environment: env,
  };
}
