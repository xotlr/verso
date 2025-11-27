import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  LayoutGrid,
  Rows3,
  Download,
  Users,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react"
import { Aurora } from "@/components/aurora"
import { Noise } from "@/components/noise"

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Aurora Background */}
        <div className="absolute inset-0 -z-10">
          <Aurora
            amplitude={1.4}
            blend={0.7}
            speed={0.6}
          />
        </div>

        {/* Noise Overlay */}
        <Noise opacity={0.03} className="-z-10" />

        <div className="container max-w-4xl mx-auto px-6 py-24">
          <div className="flex flex-col items-center text-center space-y-8">
            <Badge variant="secondary" className="font-normal">
              Professional Screenwriting Software
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tight font-medium">
              Write your screenplay,{" "}
              <span className="text-primary">your way</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Verso is the modern screenwriting tool that helps you focus on your
              story. With powerful organization tools, industry-standard formatting,
              and seamless collaboration.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" asChild className="h-11 px-6">
                <Link href="/signup">
                  Start Writing Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-11 px-6">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-muted/30">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-3xl sm:text-4xl font-medium">
              Everything you need to write
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Powerful features designed for screenwriters, from first draft to
              final polish.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<FileText className="h-6 w-6" />}
              title="Industry-Standard Formatting"
              description="Automatic screenplay formatting that follows Hollywood standards. Just write, we handle the rest."
            />
            <FeatureCard
              icon={<LayoutGrid className="h-6 w-6" />}
              title="Index Cards"
              description="Organize your scenes visually with drag-and-drop index cards. Perfect for outlining and restructuring."
            />
            <FeatureCard
              icon={<Rows3 className="h-6 w-6" />}
              title="Beat Board"
              description="Map out your story beats and see the big picture. Track character arcs and plot points."
            />
            <FeatureCard
              icon={<Download className="h-6 w-6" />}
              title="Export Anywhere"
              description="Export to PDF, Final Draft (FDX), Fountain, and more. Your screenplay, your format."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Team Collaboration"
              description="Write together in real-time. Perfect for writing partners, rooms, and production teams."
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Character Tracking"
              description="Keep track of characters, locations, and dialogue. Automatic analysis and statistics."
            />
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-32">
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
              ]}
              cta="Contact Sales"
              ctaHref="/pricing"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-primary text-primary-foreground">
        <div className="container max-w-3xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-medium">
            Ready to write your masterpiece?
          </h2>
          <p className="text-lg opacity-80 max-w-xl mx-auto">
            Join thousands of screenwriters who trust Verso for their creative
            work.
          </p>
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="h-11 px-6"
          >
            <Link href="/signup">
              Start Writing Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-6 rounded-xl border bg-card">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="text-base font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
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
      className={`p-6 rounded-xl border ${
        highlighted
          ? "border-primary bg-primary/5 shadow-lg lg:scale-105"
          : "bg-card"
      }`}
    >
      {highlighted && (
        <Badge className="mb-4 font-normal">Most Popular</Badge>
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
        className="w-full"
        variant={highlighted ? "default" : "outline"}
        asChild
      >
        <Link href={ctaHref}>{cta}</Link>
      </Button>
    </div>
  )
}
