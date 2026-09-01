'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0f172a', color: 'white' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Something went wrong</h2>
        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>The app hit an unexpected error while rendering. Please refresh and try again.</p>
        <button onClick={() => reset()} style={{ padding: '0.75rem 1rem', borderRadius: '999px', background: '#6366f1', color: 'white', border: 'none', cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    </div>
  );
}
