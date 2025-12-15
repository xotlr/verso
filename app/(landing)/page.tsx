import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ArrowRight, Play } from "lucide-react"
import { Aurora } from "@/components/aurora"
import { Noise } from "@/components/noise"
import { RotatingText } from "@/components/landing/rotating-text"
import { StatsSection } from "@/components/landing/stats-section"
import { FeaturesEnhancedSection } from "@/components/landing/features-enhanced-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { FAQSection } from "@/components/landing/faq-section"

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden -mt-[4.5rem] pt-[4.5rem]">
        {/* Aurora Background - extends behind navbar */}
        <div className="absolute inset-0 -z-10">
          <Aurora
            amplitude={1.4}
            blend={0.7}
            speed={0.6}
          />
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
              Verso is the modern screenwriting tool that helps you focus on your
              story. With powerful organization tools, industry-standard formatting,
              and seamless collaboration.
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

            {/* Social Proof */}
            <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-muted border-2 border-background"
                  />
                ))}
              </div>
              <span>Trusted by 10,000+ screenwriters worldwide</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection />

      {/* Features Section (Tabbed) */}
      <FeaturesEnhancedSection />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Pricing Preview Section */}
      <section className="py-24 sm:py-32">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-4 mb-16 sm:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
              Simple, transparent pricing
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              Start free and upgrade as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            <PricingCard
              name="Free"
              price="$0"
              description="Perfect for getting started"
              features={[
                "Unlimited screenplays",
                "1 project",
                "PDF export",
                "Basic analytics",
              ]}
              cta="Get Started"
              ctaHref="/signup"
            />
            <PricingCard
              name="Plus"
              price="$12.99"
              period="/month"
              description="For serious writers"
              features={[
                "Unlimited projects",
                "All export formats",
                "Character analytics",
                "Cloud sync",
              ]}
              cta="Start Plus Trial"
              ctaHref="/signup"
              highlighted
            />
            <PricingCard
              name="Pro"
              price="$29.99"
              period="/month"
              description="For writing teams"
              features={[
                "Everything in Plus",
                "Real-time collaboration",
                "Up to 5 team members",
                "Version history",
              ]}
              cta="Start Pro Trial"
              ctaHref="/signup"
            />
            <PricingCard
              name="Max"
              price="$99.99"
              period="/user/month"
              description="For production"
              features={[
                "Everything in Pro",
                "Unlimited team",
                "Production tools",
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
            Ready to write your masterpiece?
          </h2>
          <p className="text-base sm:text-lg opacity-80 max-w-xl mx-auto">
            Join thousands of screenwriters who trust Verso for their creative
            work. Start free, upgrade when you need to.
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
      className={`p-6 rounded-xl border transition-all duration-300 ${
        highlighted
          ? "border-primary bg-primary/5 shadow-lg lg:scale-[1.02] ring-2 ring-primary/20"
          : "bg-card hover:border-border/80 hover:shadow-md"
      }`}
    >
      {highlighted && (
        <Badge className="mb-4 font-normal bg-primary text-primary-foreground">Most Popular</Badge>
      )}
      <h3 className="text-lg font-medium">{name}</h3>
      <div className="mt-2 mb-4">
        <span className="text-4xl font-medium">{price}</span>
        {period && <span className="text-muted-foreground/60">{period}</span>}
      </div>
      <p className="text-sm text-muted-foreground/80 mb-6">{description}</p>
      <ul className="space-y-3 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-sm font-light">
            <Check className="h-4 w-4 text-primary flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <Button
        className="w-full h-11 group"
        variant={highlighted ? "default" : "outline"}
        asChild
      >
        <Link href={ctaHref} className="flex items-center justify-center gap-2">
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </Button>
    </div>
  )
}
