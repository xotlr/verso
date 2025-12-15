"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, LayoutGrid, Share2, Download, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepProps {
  number: number
  icon: React.ReactNode
  title: string
  description: string
}

function Step({ number, icon, title, description }: StepProps) {
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
        "relative flex-1 scroll-fade-in",
        isVisible && "in-view"
      )}
    >
      {/* Card container matching app style */}
      <div className="h-full p-4 sm:p-5 rounded-xl border bg-card hover:border-border/80 hover:shadow-md transition-all duration-300">
        <div className="flex flex-col h-full">
          {/* Icon and number row */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 text-primary">
                <div className="[&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">
                  {icon}
                </div>
              </div>
            </div>
            {/* Step number badge */}
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
              {number}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1.5">
            <h3 className="text-sm sm:text-base font-semibold leading-tight">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HowItWorksSection() {
  const steps = [
    {
      icon: <FileText className="h-6 w-6 lg:h-7 lg:w-7" />,
      title: "Create Your Project",
      description:
        "Start with a blank screenplay or choose from templates with metadata setup.",
    },
    {
      icon: <LayoutGrid className="h-6 w-6 lg:h-7 lg:w-7" />,
      title: "Organize Your Story",
      description:
        "Use index cards, beat boards, and character tracking to visualize your narrative.",
    },
    {
      icon: <Pencil className="h-6 w-6 lg:h-7 lg:w-7" />,
      title: "Write with Auto-Formatting",
      description:
        "Focus on story while Verso handles industry-standard formatting automatically.",
    },
    {
      icon: <Share2 className="h-6 w-6 lg:h-7 lg:w-7" />,
      title: "Collaborate in Real-Time",
      description:
        "Invite co-writers and producers. See live changes with full version history.",
    },
    {
      icon: <Download className="h-6 w-6 lg:h-7 lg:w-7" />,
      title: "Export & Share",
      description:
        "Export to PDF, Final Draft, or Fountain. Share links or publish to the community.",
    },
  ]

  return (
    <section id="how-it-works" className="py-16 sm:py-20 lg:py-24 scroll-mt-16">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 sm:space-y-3 mb-10 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold">
            From idea to finished screenplay
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
            A streamlined workflow designed for how screenwriters actually work
          </p>
        </div>

        {/* Grid layout: 2 cols on mobile, 5 cols on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {steps.map((step, index) => (
            <Step
              key={index}
              number={index + 1}
              icon={step.icon}
              title={step.title}
              description={step.description}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
