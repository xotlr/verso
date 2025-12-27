import { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Pen, Users, Zap, Heart } from "lucide-react"

export const metadata: Metadata = {
  title: "About | Verso",
  description: "Why we built Verso. Screenwriting software that runs anywhere, syncs everywhere, costs nothing to start.",
}

export default function AboutPage() {
  return (
    <div className="py-24 sm:py-32">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <div className="text-center space-y-4 mb-20">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium">
            Why we built Verso
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Most screenwriting software was designed before cloud sync, before real-time collaboration, before you could write on your phone. We thought it was time for something new.
          </p>
        </div>

        {/* Mission */}
        <section className="mb-24">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-medium mb-6">The problem</h2>
            <p className="text-muted-foreground mb-4">
              The leading screenwriting software costs $250 and hasn&apos;t fundamentally changed since the 2000s. It crashes. It doesn&apos;t sync. Collaboration means emailing files back and forth.
            </p>
            <p className="text-muted-foreground mb-4">
              Free alternatives exist, but they&apos;re either too simple or too complicated. Writers shouldn&apos;t have to choose between their budget and their workflow.
            </p>
            <p className="text-muted-foreground">
              We built Verso to be the tool we wished existed: industry-standard formatting, real-time collaboration, runs anywhere, free to start.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="mb-24">
          <h2 className="text-2xl sm:text-3xl font-medium mb-12 text-center">What we care about</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Pen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Writing comes first</h3>
              <p className="text-sm text-muted-foreground">
                If a feature doesn&apos;t help you write, we don&apos;t build it.
              </p>
            </div>
            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Speed</h3>
              <p className="text-sm text-muted-foreground">
                The software should disappear. You type, it works.
              </p>
            </div>
            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Real collaboration</h3>
              <p className="text-sm text-muted-foreground">
                Same script, same time. Not file attachments.
              </p>
            </div>
            <div className="p-6 rounded-xl border bg-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Details</h3>
              <p className="text-sm text-muted-foreground">
                Margins, page breaks, (MORE)/(CONT&apos;D). We get it right.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-muted/30 rounded-2xl p-12 border">
          <h2 className="text-2xl sm:text-3xl font-medium mb-4">
            Try it
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Free tier. No credit card. See if it works for you.
          </p>
          <Button size="lg" asChild className="group">
            <Link href="/signup" className="flex items-center gap-2">
              Start Writing
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  )
}
