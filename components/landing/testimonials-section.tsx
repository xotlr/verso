"use client"

import { useEffect, useRef, useState } from "react"
import { Star, Quote } from "lucide-react"
import { cn } from "@/lib/utils"

interface TestimonialProps {
  quote: string
  author: string
  role: string
  rating: number
  index?: number
}

function TestimonialCard({ quote, author, role, rating, index = 0 }: TestimonialProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        "p-4 sm:p-6 rounded-xl border bg-card scroll-fade-in card-subtle-hover",
        isVisible && "in-view"
      )}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
        <Quote className="h-6 w-6 sm:h-8 sm:w-8 text-primary/20 flex-shrink-0" />
        <div className="flex gap-0.5">
          {Array.from({ length: rating }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-primary text-primary" />
          ))}
        </div>
      </div>

      <blockquote className="text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
        {quote}
      </blockquote>

      <div className="border-t border-border/50 pt-3 sm:pt-4">
        <div className="font-medium text-xs sm:text-sm">{author}</div>
        <div className="text-[10px] sm:text-xs text-muted-foreground">{role}</div>
      </div>
    </div>
  )
}

export function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "Verso has completely transformed my writing process. The index cards and beat board help me see the big picture, and the formatting is flawless. It's everything I need in one place.",
      author: "Sarah Mitchell",
      role: "Screenwriter, 'Night Falls'",
      rating: 5,
    },
    {
      quote:
        "As someone who writes on both desktop and mobile, Verso's cross-device sync is a game changer. I can outline on my iPad during my commute and write scenes on my laptop at home seamlessly.",
      author: "Marcus Chen",
      role: "TV Writer, Emmy Nominee",
      rating: 5,
    },
    {
      quote:
        "The collaboration features are incredible. My writing partner and I work in different time zones, and Verso makes it feel like we're in the same room. Version history saved us countless times.",
      author: "Elena Rodriguez",
      role: "Co-Writer, 'Urban Legends'",
      rating: 5,
    },
    {
      quote:
        "I switched from Final Draft and never looked back. Verso is faster, more intuitive, and the export quality is perfect.",
      author: "James O'Connor",
      role: "Independent Filmmaker",
      rating: 5,
    },
    {
      quote:
        "The production tools are a revelation. Shotlists, schedules, and budgets all integrated with the script? This is the future of pre-production planning.",
      author: "Priya Sharma",
      role: "Producer & Director",
      rating: 5,
    },
    {
      quote:
        "I teach screenwriting at the university level, and Verso has become essential for my students. It's professional-grade but approachable for beginners. The free tier is genuinely generous.",
      author: "Dr. Robert Hayes",
      role: "Film Studies Professor",
      rating: 5,
    },
  ]

  return (
    <section className="py-20 sm:py-32 bg-muted/20">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 sm:space-y-4 mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            Loved by screenwriters
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
            See what writers are saying about their experience with Verso
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} {...testimonial} index={index} />
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-10 sm:mt-16 pt-8 sm:pt-12 border-t border-border/40">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 opacity-60">
            <div className="text-xs sm:text-sm font-medium w-full sm:w-auto text-center mb-2 sm:mb-0">Featured in:</div>
            <div className="text-xs sm:text-sm text-muted-foreground">The Screenwriter&apos;s Journal</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Film Independent</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Writers Guild Newsletter</div>
          </div>
        </div>
      </div>
    </section>
  )
}
