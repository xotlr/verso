import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, IBM_Plex_Sans, Courier_Prime, Outfit, Fraunces, Plus_Jakarta_Sans, Bodoni_Moda, Plaster, Montserrat, Space_Grotesk, Space_Mono, DotGothic16, Audiowide, Oxanium, Chakra_Petch, Sixtyfour, Doto, Special_Elite, Syne, Poiret_One, Caveat, Bonheur_Royale, Badeen_Display, Bellefair, Cinzel_Decorative } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SettingsProvider } from "@/contexts/settings-context";
import { ShortcutsProvider } from "@/lib/shortcuts/shortcuts-context";
import { TeamProvider } from "@/contexts/team-context";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { WebVitals } from "@/components/analytics/web-vitals";
import { DebugMetricsProvider } from "@/components/analytics/debug-metrics-context";
import { PetalsRenderer } from "@/components/effects/petals-renderer";
import { AuroraRenderer } from "@/components/effects/aurora-renderer";
import { SplashHider } from "@/components/splash-hider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Non-critical fonts: preload: false prevents loading until CSS actually uses them
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  preload: false,
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  preload: false,
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
  preload: false,
});

const fraunces = Fraunces({
  weight: ['400', '500', '600', '700'],
  variable: "--font-fraunces",
  subsets: ["latin"],
  preload: false,
});

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700'],
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  preload: false,
});

const bodoniModa = Bodoni_Moda({
  weight: ['400', '500', '700'],
  variable: "--font-bodoni-moda",
  subsets: ["latin"],
  display: 'swap',
});

const plaster = Plaster({
  weight: '400',
  variable: "--font-plaster",
  subsets: ["latin"],
  display: 'swap',
});

const montserrat = Montserrat({
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: "--font-montserrat",
  subsets: ["latin"],
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '600', '700'],
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  preload: false,
});

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  variable: "--font-space-mono",
  subsets: ["latin"],
  preload: false,
});

const dotGothic16 = DotGothic16({
  weight: '400',
  variable: "--font-dot-gothic",
  subsets: ["latin"],
  preload: false,
});

const audiowide = Audiowide({
  weight: '400',
  variable: "--font-audiowide",
  subsets: ["latin"],
  preload: false,
});

const oxanium = Oxanium({
  weight: ['400', '500', '600', '700'],
  variable: "--font-oxanium",
  subsets: ["latin"],
  preload: false,
});

const chakraPetch = Chakra_Petch({
  weight: ['400', '500', '600', '700'],
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  preload: false,
});

const sixtyfour = Sixtyfour({
  variable: "--font-sixtyfour",
  subsets: ["latin"],
  preload: false,
});

const doto = Doto({
  weight: '400',
  variable: "--font-doto",
  subsets: ["latin"],
  preload: false,
});

const specialElite = Special_Elite({
  weight: '400',
  variable: "--font-special-elite",
  subsets: ["latin"],
  preload: false,
});

const syne = Syne({
  weight: ['400', '500', '600', '700', '800'],
  variable: "--font-syne",
  subsets: ["latin"],
  preload: false,
});

const poiretOne = Poiret_One({
  weight: '400',
  variable: "--font-poiret-one",
  subsets: ["latin"],
  preload: false,
});

const caveat = Caveat({
  weight: ['400', '500', '600', '700'],
  variable: "--font-caveat",
  subsets: ["latin"],
  preload: false,
});

const bonheurRoyale = Bonheur_Royale({
  weight: '400',
  variable: "--font-bonheur-royale",
  subsets: ["latin"],
  preload: false,
});

const badeenDisplay = Badeen_Display({
  weight: '400',
  variable: "--font-badeen-display",
  subsets: ["latin"],
  preload: false,
  adjustFontFallback: false,
});

const bellefair = Bellefair({
  weight: '400',
  variable: "--font-bellefair",
  subsets: ["latin"],
  preload: false,
});

const cinzelDecorative = Cinzel_Decorative({
  weight: ['400', '700', '900'],
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL('https://verso.ac'),
  alternates: {
    canonical: '/',
  },
  title: "VERSO - Professional Screenplay Editor",
  description: "Professional screenwriting software. Industry-standard formatting, real-time collaboration, runs in your browser.",
  manifest: "/manifest.json",
  keywords: ["screenwriting", "screenplay", "script", "screenwriter", "film", "television", "writing software", "final draft alternative"],
  authors: [{ name: "Verso" }],
  creator: "Verso",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://verso.ac",
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
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/logo.svg?v=2", type: "image/svg+xml" },
      { url: "/icons/icon-192.svg?v=2", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg?v=2", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192.svg?v=2", sizes: "192x192", type: "image/svg+xml" },
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
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${ibmPlexSans.variable} ${courierPrime.variable} ${outfit.variable} ${fraunces.variable} ${plusJakartaSans.variable} ${bodoniModa.variable} ${plaster.variable} ${montserrat.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${dotGothic16.variable} ${audiowide.variable} ${oxanium.variable} ${chakraPetch.variable} ${sixtyfour.variable} ${doto.variable} ${specialElite.variable} ${syne.variable} ${poiretOne.variable} ${caveat.variable} ${bonheurRoyale.variable} ${badeenDisplay.variable} ${bellefair.variable} ${cinzelDecorative.variable}`}
    >
      <head>
        {/* Blocking script - ONLY sets theme class, CSS handles the rest */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var t=document.cookie.match(/verso-theme=([^;]+)/);
              var s=t?t[1]:localStorage.getItem('verso-theme')||'system';
              var d=document.documentElement;
              d.classList.remove('light','dark');
              if(s==='system'){s=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}
              d.classList.add(s);
              d.style.colorScheme=s;
            }catch(e){}})()`,
          }}
        />
        {/* Splash progress + message rotation - runs client-side only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              var messages=[
                "Sharpening pencils...",
                "Brewing coffee...",
                "Avoiding writer's block...",
                "Loading Act One...",
                "Warming up the cursor...",
                "Finding the muse...",
                "Formatting montages...",
                "Procrastinating professionally...",
                "Staring at blank page...",
                "Channeling Sorkin...",
                "Rewriting the rewrite...",
                "Almost there...",
              ];
              var idx=0;
              var progress=0;
              var bar=null;
              var msgEl=null;
              var started=false;
              function update(p){
                progress=Math.max(progress,p);
                if(bar)bar.style.width=progress+'%';
              }
              function nextMessage(){
                if(msgEl){
                  if(!started){
                    idx=Math.floor(Math.random()*messages.length);
                    started=true;
                  }else{
                    idx=(idx+1)%messages.length;
                  }
                  msgEl.textContent=messages[idx];
                }
              }
              document.addEventListener('DOMContentLoaded',function(){
                update(40);
                msgEl=document.getElementById('splash-message');
                nextMessage();
                setInterval(nextMessage,1800);
              });
              window.addEventListener('load',function(){update(80)});
              window.__splashProgress={update:update,setBar:function(b){bar=b;bar.style.width=progress+'%'}};
            })()`,
          }}
        />
      </head>
      <body className="antialiased overflow-hidden h-screen">
        {/* Splash screen - dangerouslySetInnerHTML so React doesn't hydrate it */}
        <div
          id="splash-container"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              <div id="splash" style="position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;">
                <svg width="56" height="56" viewBox="140 344 720 312" fill="none" style="animation:splash-pulse 1.5s ease-in-out infinite;">
                  <polygon points="320,368 452,368 452,632 308,632 164,488" fill="currentColor"/>
                  <polygon points="500,368 620,368 620,512 764,368 836,368 572,632 500,632" fill="currentColor"/>
                </svg>
                <div id="splash-progress" style="width:140px;height:2px;border-radius:1px;overflow:hidden;">
                  <div style="height:100%;width:0%;transition:width 0.4s ease-out;"></div>
                </div>
                <p id="splash-message" style="font-size:13px;font-family:system-ui,-apple-system,sans-serif;opacity:0.6;margin:0;min-height:20px;"></p>
              </div>
            `,
          }}
        />
        {/* Inline styles for splash - transitions smoothly when theme CSS loads */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes splash-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          #splash {
            background-color: hsl(var(--background, 0 0% 8%));
            color: hsl(var(--foreground, 0 0% 90%));
            transition: background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1), color 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }
          #splash svg {
            color: hsl(var(--primary, 0 0% 90%));
            opacity: 1;
            transition: color 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }
          #splash-progress {
            background-color: hsl(var(--muted, 0 0% 15%));
            transition: background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }
          #splash-progress > div {
            background-color: hsl(var(--primary, 0 0% 50%));
            transition: background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1), width 0.4s ease-out;
          }
          #splash-message {
            color: hsl(var(--muted-foreground, 0 0% 45%));
            transition: color 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}} />
        <WebVitals />
        <AuthProvider>
          <ThemeProvider
            defaultTheme="system"
          >
            <SplashHider />
            <SettingsProvider>
              <PetalsRenderer />
              <AuroraRenderer />
              <ShortcutsProvider>
                <TeamProvider>
                  <DebugMetricsProvider>
                    {children}
                    <Toaster position="bottom-right" />
                  </DebugMetricsProvider>
                </TeamProvider>
              </ShortcutsProvider>
            </SettingsProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
