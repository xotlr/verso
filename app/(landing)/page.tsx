import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ArrowRight, Play } from "lucide-react"
import { Aurora } from "@/components/aurora"
import { Noise } from "@/components/noise"
import { RotatingText } from "@/components/landing/rotating-text"
import { AppPreviewSection } from "@/components/landing/app-preview-section"
import { UseCasesSection } from "@/components/landing/use-cases-section"
import { FeaturesEnhancedSection } from "@/components/landing/features-enhanced-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { ComparisonSection } from "@/components/landing/comparison-section"
import { FAQSection } from "@/components/landing/faq-section"

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden -mt-[4.5rem] pt-[4.5rem] rounded-b-[3rem]">
        {/* Aurora Background - extends behind navbar */}
        <div className="absolute inset-0 -z-10 bg-primary">
          <Aurora speed={1.0} />
        </div>

        {/* Noise Overlay */}
        <Noise opacity={0.03} className="-z-10" />

        <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
            <Badge
              variant="secondary"
              className="font-normal text-xs sm:text-sm px-3 py-1 relative overflow-hidden isolate before:absolute before:inset-0 before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:mix-blend-overlay"
            >
              Professional Screenwriting Software
            </Badge>

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
                className="h-12 sm:h-11 px-6 text-base sm:text-sm group btn-hover-lift w-full sm:w-auto"
              >
                <Link href="/signup" className="flex items-center justify-center gap-2">
                  Start Writing Free
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-12 sm:h-11 px-6 text-base sm:text-sm group btn-hover-lift w-full sm:w-auto"
              >
                <Link href="/#how-it-works" className="flex items-center justify-center gap-2">
                  <Play className="h-4 w-4" />
                  See How It Works
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
      className={`relative p-4 sm:p-6 rounded-xl border transition-all duration-300 hover:-translate-y-1 ${
        highlighted
          ? "border-primary bg-primary text-primary-foreground shadow-lg lg:scale-[1.02] hover:shadow-xl"
          : "bg-card hover:border-border/80 hover:shadow-lg"
      }`}
    >
      {highlighted && (
        <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2 font-normal text-xs text-muted-foreground uppercase tracking-wide">Most Popular</Badge>
      )}
      <h3 className="text-base sm:text-lg font-medium">{name}</h3>
      <div className="mt-1 sm:mt-2 mb-2 sm:mb-4">
        <span className="text-2xl sm:text-4xl font-medium">{price}</span>
        {period && <span className={`text-xs sm:text-sm ${highlighted ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>{period}</span>}
      </div>
      <p className={`text-xs sm:text-sm mb-3 sm:mb-6 line-clamp-2 sm:line-clamp-none ${highlighted ? "text-primary-foreground/80" : "text-muted-foreground/80"}`}>{description}</p>
      <ul className="space-y-2 sm:space-y-3 mb-3 sm:mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-normal">
            <Check className={`h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 ${highlighted ? "text-primary-foreground" : "text-primary"}`} />
            <span className="line-clamp-1 sm:line-clamp-none">{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className={`w-full h-9 sm:h-11 text-xs sm:text-sm group rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${highlighted ? "bg-black/70 text-white/90 hover:bg-black hover:text-white" : "bg-white/70 text-black/70 hover:bg-white hover:text-black"}`}
        variant="ghost"
        asChild
      >
        <Link href={ctaHref} className="flex items-center justify-center gap-1 sm:gap-2">
          {cta}
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </Button>
    </div>
  )
}
