import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Pen, Users, Zap, Heart } from "lucide-react"

export const metadata: Metadata = {
  title: "About | Verso",
  description: "Learn about Verso - the modern screenwriting software built for today's storytellers.",
}

export default function AboutPage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <div className="text-center space-y-4 mb-20">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium">
            Built for storytellers
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Verso is modern screenwriting software designed to help writers focus on what matters most: telling great stories.
          </p>
        </div>

        {/* Mission */}
        <section className="mb-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-medium mb-6">Our Mission</h2>
              <p className="text-muted-foreground mb-4">
                We believe great stories deserve great tools. Too many screenwriters struggle with outdated software that gets in the way of their creativity.
              </p>
              <p className="text-muted-foreground mb-4">
                Verso was built to change that. We&apos;ve created a writing environment that&apos;s powerful yet intuitive, professional yet accessible, and designed from the ground up for how writers actually work.
              </p>
              <p className="text-muted-foreground">
                Whether you&apos;re writing your first short film or your tenth feature, Verso gives you the tools to bring your vision to life.
              </p>
            </div>
            <div className="bg-muted/30 rounded-2xl p-8 border">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-medium text-primary mb-2">10K+</div>
                  <div className="text-sm text-muted-foreground">Writers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-medium text-primary mb-2">50K+</div>
                  <div className="text-sm text-muted-foreground">Screenplays</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-medium text-primary mb-2">100M+</div>
                  <div className="text-sm text-muted-foreground">Words Written</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-medium text-primary mb-2">99.9%</div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-24">
          <h2 className="text-2xl sm:text-3xl font-medium mb-12 text-center">What We Believe</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Pen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Writers First</h3>
              <p className="text-sm text-muted-foreground">
                Every feature we build starts with the question: does this help writers write?
              </p>
            </div>
            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Speed Matters</h3>
              <p className="text-sm text-muted-foreground">
                Your tools should never slow you down. We obsess over performance.
              </p>
            </div>
            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Collaboration</h3>
              <p className="text-sm text-muted-foreground">
                Great scripts often come from great partnerships. We make working together seamless.
              </p>
            </div>
            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Craft & Care</h3>
              <p className="text-sm text-muted-foreground">
                We sweat the details because we know you do too.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-muted/30 rounded-2xl p-12 border">
          <h2 className="text-2xl sm:text-3xl font-medium mb-4">
            Ready to start writing?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of screenwriters who&apos;ve made Verso their creative home.
          </p>
          <Button size="lg" asChild className="group">
            <Link href="/signup" className="flex items-center gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  )
}
