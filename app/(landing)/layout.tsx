import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { ScrollArea } from "@/components/ui/scroll-area"
import Script from "next/script"

// Structured data for SEO (JSON-LD)
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "VERSO",
      "description": "Professional screenwriting software with industry-standard formatting, real-time collaboration, and browser-based access.",
      "applicationCategory": "MultimediaApplication",
      "applicationSubCategory": "Screenwriting Software",
      "operatingSystem": "Web Browser (Chrome, Firefox, Safari, Edge)",
      "url": "https://verso.ink",
      "image": "https://verso.ink/og-image.png",
      "screenshot": "https://verso.ink/images/editor-preview.png",
      "featureList": [
        "Industry-standard screenplay formatting",
        "Real-time collaboration",
        "PDF export",
        "Final Draft import/export",
        "Fountain format support",
        "Index cards view",
        "Character analytics"
      ],
      "offers": [
        {
          "@type": "Offer",
          "name": "Free",
          "price": "0",
          "priceCurrency": "USD",
          "description": "Unlimited screenplays, 1 project, PDF export"
        },
        {
          "@type": "Offer",
          "name": "Plus",
          "price": "12.99",
          "priceCurrency": "USD",
          "billingPeriod": "P1M",
          "description": "Unlimited projects, all export formats, cloud sync"
        },
        {
          "@type": "Offer",
          "name": "Pro",
          "price": "29.99",
          "priceCurrency": "USD",
          "billingPeriod": "P1M",
          "description": "Real-time collaboration, version history, up to 5 writers"
        }
      ],
      "sameAs": [
        "https://twitter.com/versoink"
      ]
    },
    {
      "@type": "Organization",
      "name": "Verso",
      "url": "https://verso.ink",
      "logo": "https://verso.ink/og-image.png",
      "description": "Professional screenwriting software for film and television writers."
    },
    {
      "@type": "WebSite",
      "name": "VERSO",
      "url": "https://verso.ink",
      "description": "Professional screenwriting software"
    }
  ]
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ScrollArea className="h-screen">
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </ScrollArea>
    </>
  )
}
