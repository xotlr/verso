import { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { SettingsProvider } from '@/contexts/settings-context';
import { Toaster } from '@/components/ui/sonner';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Verso - View Screenplay',
  description: 'View shared screenplay',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="system">
      <SettingsProvider>
        <div className="min-h-screen bg-background relative z-10">
          {children}
        </div>
        <Toaster />
      </SettingsProvider>
    </ThemeProvider>
  );
}
