import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, IBM_Plex_Sans, Courier_Prime, Outfit, Fraunces, Plus_Jakarta_Sans, Bodoni_Moda, Plaster, Montserrat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SettingsProvider } from "@/contexts/settings-context";
import { ShortcutsProvider } from "@/lib/shortcuts/shortcuts-context";
import { TeamProvider } from "@/contexts/team-context";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { WebVitals } from "@/components/analytics/web-vitals";
import { PerformancePanel } from "@/components/analytics/performance-panel";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  variable: "--font-ibm-plex",
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  weight: ['400', '700'],
  variable: "--font-courier-prime",
  subsets: ["latin"],
});

const outfit = Outfit({
  weight: ['300', '400', '500', '600'],
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  weight: ['400', '500', '600', '700'],
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700'],
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const bodoniModa = Bodoni_Moda({
  weight: ['400', '700'],
  variable: "--font-bodoni-moda",
  subsets: ["latin"],
});

const plaster = Plaster({
  weight: '400',
  variable: "--font-plaster",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VERSO - Professional Screenplay Editor",
  description: "Professional screenwriting software. Industry-standard formatting, real-time collaboration, runs in your browser.",
  manifest: "/manifest.json",
  keywords: ["screenwriting", "screenplay", "script", "screenwriter", "film", "television", "writing software", "final draft alternative"],
  authors: [{ name: "Verso" }],
  creator: "Verso",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://verso.ink",
    siteName: "VERSO",
    title: "VERSO - Professional Screenplay Editor",
    description: "Professional screenwriting software. Industry-standard formatting, real-time collaboration, runs in your browser.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "VERSO - Professional Screenplay Editor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VERSO - Professional Screenplay Editor",
    description: "Professional screenwriting software. Industry-standard formatting, real-time collaboration, runs in your browser.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VERSO",
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${ibmPlexSans.variable} ${courierPrime.variable} ${outfit.variable} ${fraunces.variable} ${plusJakartaSans.variable} ${bodoniModa.variable} ${plaster.variable} ${montserrat.variable}`}
    >
      <body className="antialiased overflow-hidden h-screen">
        <WebVitals />
        <AuthProvider>
          <ThemeProvider
            defaultTheme="system"
          >
            <SettingsProvider>
              <ShortcutsProvider>
                <TeamProvider>
                  {children}
                  <Toaster position="bottom-right" />
                  <PerformancePanel />
                </TeamProvider>
              </ShortcutsProvider>
            </SettingsProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
