"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, LayoutGrid, Share2, Download, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"

interface StepProps {
  number: number
  icon: React.ReactNode
  title: string
  description: string
  isLast?: boolean
}

function Step({ number, icon, title, description, isLast }: StepProps) {
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
      {/* Desktop: Horizontal timeline connector */}
      {!isLast && (
        <div className="hidden lg:block absolute left-[calc(50%+28px)] top-10 w-[calc(100%-56px)] h-[2px] bg-gradient-to-r from-border via-border/50 to-transparent -z-10" />
      )}

      {/* Mobile: Vertical connector */}
      {!isLast && (
        <div className="lg:hidden absolute left-6 top-16 bottom-0 w-[2px] bg-gradient-to-b from-border to-transparent -z-10" />
      )}

      <div className="flex flex-col items-start lg:items-center gap-3 lg:gap-4">
        {/* Icon container with number badge */}
        <div className="relative flex items-center gap-3 lg:flex-col lg:gap-2">
          <div className="relative">
            <div className="flex items-center justify-center w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 text-primary shadow-sm">
              <div className="scale-110">
                {icon}
              </div>
            </div>
            {/* Number badge */}
            <div className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-md">
              {number}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1.5 lg:text-center">
          <h3 className="text-base lg:text-lg font-semibold leading-tight">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground leading-snug max-w-[280px]">
            {description}
          </p>
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

        {/* Desktop: Horizontal grid, Mobile: Vertical list */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-4 lg:items-start">
          {steps.map((step, index) => (
            <Step
              key={index}
              number={index + 1}
              icon={step.icon}
              title={step.title}
              description={step.description}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
