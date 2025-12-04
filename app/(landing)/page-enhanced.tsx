import { NavbarEnhanced } from "@/components/landing/navbar-enhanced"
import { HeroEnhanced } from "@/components/landing/hero-enhanced"
import { StatsSection } from "@/components/landing/stats-section"
import { FeaturesEnhancedSection } from "@/components/landing/features-enhanced-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { FAQSection } from "@/components/landing/faq-section"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check } from "lucide-react"
import Link from "next/link"

/**
 * Enhanced Landing Page for Verso
 *
 * This is the complete updated landing page that showcases all features,
 * includes micro-interactions, and provides a superior UX.
 *
 * To use this version:
 * 1. Rename current page.tsx to page-old.tsx (backup)
 * 2. Rename this file to page.tsx
 * 3. Test thoroughly on mobile and desktop
 */

// Pricing Section Component (inline for completeness)
function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  ctaHref,
  highlighted,
}: {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  cta: string
  ctaHref: string
  highlighted?: boolean
}) {
  return (
    <div
      className={`p-6 rounded-xl border card-interactive ${
        highlighted
          ? "border-primary bg-primary/5 shadow-lg lg:scale-105"
          : "bg-card"
      }`}
    >
      {highlighted && (
        <div className="mb-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium inline-block">
          Most Popular
        </div>
      )}
      <h3 className="text-lg font-medium">{name}</h3>
      <div className="mt-2 mb-4">
        <span className="text-4xl font-medium">{price}</span>
        {period && <span className="text-muted-foreground">{period}</span>}
      </div>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>
      <ul className="space-y-3 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <Button
        className="w-full btn-hover-lift"
        variant={highlighted ? "default" : "outline"}
        asChild
      >
        <Link href={ctaHref}>{cta}</Link>
      </Button>
    </div>
  )
}

function PricingSection() {
  return (
    <section id="pricing" className="py-32 scroll-mt-16">
      <div className="container max-w-5xl mx-auto px-6">
        <div className="text-center space-y-4 mb-20">
          <h2 className="text-3xl sm:text-4xl font-medium">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start free and upgrade as you grow. No hidden fees.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          <PricingCard
            name="Free"
            price="$0"
            description="Perfect for getting started"
            features={[
              "Up to 3 projects",
              "Industry-standard formatting",
              "Index cards & beat board",
              "PDF export",
              "Mobile app access",
            ]}
            cta="Get Started"
            ctaHref="/signup"
          />
          <PricingCard
            name="Pro"
            price="$12"
            period="/month"
            description="For serious screenwriters"
            features={[
              "Unlimited projects",
              "All export formats",
              "Version history",
              "AI analysis",
              "Priority support",
              "Advanced analytics",
            ]}
            cta="Start Pro Trial"
            ctaHref="/signup"
            highlighted
          />
          <PricingCard
            name="Team"
            price="$29"
            period="/month"
            description="For writing teams"
            features={[
              "Everything in Pro",
              "Real-time collaboration",
              "Up to 10 team members",
              "Team workspace",
              "Audit logs",
            ]}
            cta="Contact Sales"
            ctaHref="/pricing"
          />
        </div>
      </div>
    </section>
  )
}

// CTA Section Component
function CTASection() {
  return (
    <section className="py-32 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/90" />

      <div className="container max-w-3xl mx-auto px-6 text-center space-y-8 relative z-10">
        <h2 className="text-3xl sm:text-4xl font-medium">
          Ready to write your masterpiece?
        </h2>
        <p className="text-lg opacity-90 max-w-xl mx-auto">
          Join thousands of screenwriters who trust Verso for their creative work.
          Start writing for free today.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="btn-hover-lift h-12 px-8"
          >
            <Link href="/signup">
              Start Writing Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="btn-hover-lift h-12 px-8 border-primary-foreground/20 hover:bg-primary-foreground/10 text-primary-foreground"
          >
            <Link href="/pricing">View All Plans</Link>
          </Button>
        </div>

        {/* Trust indicator */}
        <div className="pt-8 text-sm opacity-75">
          No credit card required • Free forever • Upgrade anytime
        </div>
      </div>
    </section>
  )
}

export default function LandingPageEnhanced() {
  return (
    <>
      {/* Navigation */}
      <NavbarEnhanced />

      {/* Main Content */}
      <main id="main-content">
        {/* Hero */}
        <HeroEnhanced />

        {/* Stats */}
        <StatsSection />

        {/* Features (Tabbed) */}
        <FeaturesEnhancedSection />

        {/* How It Works */}
        <HowItWorksSection />

        {/* Testimonials */}
        <TestimonialsSection />

        {/* Pricing */}
        <PricingSection />

        {/* FAQ */}
        <FAQSection />

        {/* Final CTA */}
        <CTASection />
      </main>

      {/* Footer */}
      <Footer />
    </>
  )
}
