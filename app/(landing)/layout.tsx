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
      "url": "https://verso.ac",
      "image": "https://verso.ac/og-image.png",
      "screenshot": "https://verso.ac/images/editor-preview.png",
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
      "url": "https://verso.ac",
      "logo": "https://verso.ac/og-image.png",
      "description": "Professional screenwriting software for film and television writers."
    },
    {
      "@type": "WebSite",
      "name": "VERSO",
      "url": "https://verso.ac",
      "description": "Professional screenwriting software"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is the free tier actually free?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Unlimited pages, unlimited screenplays, 1 project, PDF export, index cards, beat board. No credit card required. No trial period."
          }
        },
        {
          "@type": "Question",
          "name": "Can I import from Final Draft?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Import from Final Draft, Fountain, Highland, Fade In, PDF, and more. Formatting carries over."
          }
        },
        {
          "@type": "Question",
          "name": "Does it work offline?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Verso is a PWA. Write offline, sync when you reconnect. You can install it like a native app."
          }
        },
        {
          "@type": "Question",
          "name": "How does collaboration work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Pro plan and up. Invite collaborators by email. You both edit the same script simultaneously. Cursors visible, changes instant."
          }
        },
        {
          "@type": "Question",
          "name": "What formats can I export?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "PDF (free). Final Draft (FDX), Fountain, plain text (paid plans)."
          }
        },
        {
          "@type": "Question",
          "name": "Can I cancel anytime?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Cancel whenever. You keep access until your billing period ends. Your scripts stay accessible on the free tier."
          }
        },
        {
          "@type": "Question",
          "name": "Is my work private?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Encrypted in transit and at rest. We don't read your scripts. We don't sell your data. You can delete everything anytime."
          }
        },
        {
          "@type": "Question",
          "name": "Student discounts?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Email us with your .edu address. We'll set you up."
          }
        }
      ]
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
      <ScrollArea className="h-screen relative z-10">
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
