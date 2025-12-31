import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { Aurora } from "@/components/aurora"
import { BlurOverlay } from "@/components/ui/blur-overlay"
import { RotatingText } from "@/components/landing/rotating-text"
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text"
import { AppPreviewSection } from "@/components/landing/app-preview-section"
import { UseCasesSection } from "@/components/landing/use-cases-section"
import { FeaturesEnhancedSection } from "@/components/landing/features-enhanced-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { ComparisonSection } from "@/components/landing/comparison-section"
import { FAQSection } from "@/components/landing/faq-section"
import { PricingCard } from "@/components/pricing"

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden -mt-20 pt-20 rounded-b-[3rem]">
        {/* Aurora Background - extends behind navbar */}
        <div className="absolute inset-0 -z-10">
          <Aurora speed={1.0} />
        </div>

        {/* Frosted glass overlay */}
        <BlurOverlay blur={24} opacity={0.5} fadeEdges />

        <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-24 relative z-10">
          <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
            <div className="group rounded-full border border-black/5 bg-neutral-100 text-base transition-all ease-in hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800">
              <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1.5 text-xs sm:text-sm font-normal">
                Unlimited screenplays, free forever
              </AnimatedShinyText>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight font-medium leading-[1.1]">
              Write your screenplay,{" "}
              <span className="text-primary italic block sm:inline mt-1 sm:mt-0">
                <RotatingText words={["your way", "effortlessly", "beautifully"]} />
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed px-4 sm:px-0">
              Industry-standard formatting. Real-time collaboration. Runs in your browser.
              Free to start.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4 w-full sm:w-auto px-4 sm:px-0">
              <Button
                size="lg"
                asChild
                className="rounded-full h-12 sm:h-11 px-6 text-base sm:text-sm group shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto"
              >
                <Link href="/signup" className="flex items-center justify-center gap-2">
                  Start Writing Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <UseCasesSection />

      {/* Features Section (Tabbed) */}
      <FeaturesEnhancedSection />

      {/* Comparison Section */}
      <ComparisonSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* App Preview with Parallax */}
      <AppPreviewSection />

      {/* Pricing Preview Section */}
      <section className="py-24 sm:py-32 bg-muted rounded-[3rem]">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-4 mb-16 sm:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
              Pricing
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              Free tier is real. Paid tiers unlock more.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 items-start">
            <PricingCard
              name="Free"
              price="$0"
              description="Write unlimited pages"
              features={[
                "Unlimited screenplays",
                "1 project",
                "PDF export",
                "Index cards",
              ]}
              cta="Start Free"
              ctaHref="/signup"
            />
            <PricingCard
              name="Plus"
              price="$12.99"
              period="/month"
              description="Multiple projects, all exports"
              features={[
                "Unlimited projects",
                "FDX + Fountain export",
                "Character analytics",
                "Cloud sync",
              ]}
              cta="Try Plus"
              ctaHref="/signup"
              highlighted
            />
            <PricingCard
              name="Pro"
              price="$29.99"
              period="/month"
              description="Write with your team"
              features={[
                "Everything in Plus",
                "Real-time collaboration",
                "Up to 5 writers",
                "Version history",
              ]}
              cta="Try Pro"
              ctaHref="/signup"
            />
            <PricingCard
              name="Max"
              price="$99.99"
              period="/user/month"
              description="Production-ready"
              features={[
                "Everything in Pro",
                "Unlimited team",
                "Schedules + budgets",
                "Admin controls",
              ]}
              cta="Contact Sales"
              ctaHref="/pricing"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <section className="py-24 sm:py-32 bg-primary text-primary-foreground">
        <div className="container max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6 sm:space-y-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            Start writing now
          </h2>
          <p className="text-base sm:text-lg opacity-80 max-w-xl mx-auto">
            No credit card. No setup. Open Verso and write.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2">
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="h-12 sm:h-11 px-6 text-base sm:text-sm group btn-hover-lift"
            >
              <Link href="/signup" className="flex items-center justify-center gap-2">
                Start Writing Free
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              asChild
              className="h-12 sm:h-11 px-6 text-base sm:text-sm text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

