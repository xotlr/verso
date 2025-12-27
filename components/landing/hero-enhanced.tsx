import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Play } from "lucide-react"
import { Aurora } from "@/components/aurora"
import { Noise } from "@/components/noise"
import { RotatingText } from "@/components/landing/rotating-text"

export function HeroEnhanced() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 -z-10">
        <Aurora speed={0.6} />
      </div>

      {/* Noise Overlay */}
      <Noise opacity={0.03} className="-z-10" />

      <div className="container max-w-5xl mx-auto px-6 py-24">
        <div className="flex flex-col items-center text-center space-y-8 animate-fade-in">
          {/* Badge */}
          <Badge
            variant="secondary"
            className="font-normal px-4 py-1.5 hover:bg-secondary/80 transition-colors duration-fast"
          >
            Professional Screenwriting Software
          </Badge>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight font-medium max-w-4xl">
            Write your screenplay,{" "}
            <span className="text-primary italic">
              <RotatingText
                words={["your way", "effortlessly", "beautifully", "collaboratively"]}
              />
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Verso is the modern screenwriting tool that helps you focus on your
            story. With powerful organization tools, industry-standard formatting,
            and seamless collaboration.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" asChild className="btn-hover-lift h-12 px-8 text-base">
              <Link href="/signup">
                Start Writing Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="btn-hover-lift h-12 px-8 text-base"
            >
              <Link href="#features">
                <Play className="mr-2 h-5 w-5" />
                See How It Works
              </Link>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="pt-8 flex flex-col items-center gap-3">
            <div className="flex -space-x-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-background"
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Join screenwriters bringing their stories to life
            </p>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-border/40 flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
        </div>
      </div>
    </section>
  )
}
