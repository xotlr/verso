"use client"

import { useEffect, useRef, useState } from "react"
import { FileText, LayoutGrid, Share2, Download } from "lucide-react"
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
      { threshold: 0.2 }
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
        "relative flex flex-col sm:flex-row gap-4 sm:gap-6 scroll-fade-in",
        isVisible && "in-view"
      )}
    >
      {/* Number Badge */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary text-primary-foreground font-semibold text-base sm:text-lg">
          {number}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2 sm:space-y-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <h3 className="text-lg sm:text-xl font-medium">{title}</h3>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {/* Connector Line (hidden on last item) */}
      <div className="absolute left-5 sm:left-6 top-10 sm:top-6 bottom-0 w-0.5 bg-border/50 -z-10 last:hidden" />
    </div>
  )
}

export function HowItWorksSection() {
  const steps = [
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Create Your Project",
      description:
        "Start with a blank screenplay or choose from professional templates. Set up your project metadata, including title, logline, and genre.",
    },
    {
      icon: <LayoutGrid className="h-5 w-5" />,
      title: "Organize Your Story",
      description:
        "Use index cards to outline scenes, beat boards to map story structure, and character tracking to develop your cast. Visualize your narrative before diving into dialogue.",
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Write with Industry Formatting",
      description:
        "Focus on your story while Verso handles formatting automatically. Switch between scene headings, action, character names, and dialogue with intelligent keyboard shortcuts.",
    },
    {
      icon: <Share2 className="h-5 w-5" />,
      title: "Collaborate in Real-Time",
      description:
        "Invite co-writers, get feedback from producers, or work with your writing room. See changes as they happen with live collaboration and version history.",
    },
    {
      icon: <Download className="h-5 w-5" />,
      title: "Export & Share",
      description:
        "Export to industry-standard formats including PDF, Final Draft (FDX), and Fountain. Share public links or publish to the Verso community to get discovered.",
    },
  ]

  return (
    <section id="how-it-works" className="py-20 sm:py-32 scroll-mt-16">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 sm:space-y-4 mb-12 sm:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            From idea to finished screenplay
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
            A streamlined workflow designed for how screenwriters actually work
          </p>
        </div>

        <div className="space-y-8 sm:space-y-12 md:space-y-16">
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
