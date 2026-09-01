import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/AuthContext';
import { BoardProvider } from '@/lib/BoardContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduBoard',
  description: 'AI-powered smart classroom platform with gesture control, AI teaching tools, and real-time collaboration.',
  manifest: '/manifest.json',
  applicationName: 'EduBoard',
  keywords: ['EduBoard', 'gesture control', 'AI classroom', 'education', 'whiteboard', 'collaboration'],
  authors: [{ name: 'EduBoard' }],
  openGraph: {
    title: 'EduBoard',
    description: 'AI-powered smart classroom platform',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('eduboard-theme')||'light';var r=document.documentElement;r.classList.toggle('dark',t!=='light');if(t!=='light'&&t!=='dark'){r.classList.add('theme-'+t)}r.setAttribute('data-theme',t);}catch(e){}})()`,
        }} />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased transition-colors duration-200">
        <AuthProvider>
          <ThemeProvider>
            <BoardProvider>
              {children}
            </BoardProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
