import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, IBM_Plex_Sans, Courier_Prime, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SettingsProvider } from "@/contexts/settings-context";
import { TeamProvider } from "@/contexts/team-context";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";

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


export const metadata: Metadata = {
  title: "VERSO - Professional Screenplay Editor",
  description: "Write and format screenplays with AI assistance",
  manifest: "/manifest.json",
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
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${ibmPlexSans.variable} ${courierPrime.variable} ${outfit.variable}`}
    >
      <body className={`${outfit.className} antialiased`}>
        <AuthProvider>
          <ThemeProvider
            defaultTheme="system"
          >
            <SettingsProvider>
              <TeamProvider>
                {children}
                <Toaster richColors position="bottom-right" />
              </TeamProvider>
            </SettingsProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
