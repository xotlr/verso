"use client"

import { FileText, LayoutGrid, Share2, Download, Pencil } from "lucide-react"

interface StepProps {
  number: number
  icon: React.ReactNode
  title: string
  description: string
}

function Step({ number, icon, title, description }: StepProps) {
  return (
    <div className="p-3 sm:p-6 rounded-2xl bg-muted-foreground/10 card-interactive">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="text-muted-foreground/20 [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">
          {icon}
        </div>
        <span className="text-2xl sm:text-3xl font-medium text-muted-foreground/30">{number}</span>
      </div>
      <h3 className="text-xs sm:text-base font-medium mb-1 sm:mb-2">{title}</h3>
      <p className="text-[10px] sm:text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  )
}

export function HowItWorksSection() {
  const steps = [
    {
      icon: <FileText className="h-6 w-6 lg:h-7 lg:w-7" />,
      title: "Create",
      description:
        "New project. Blank page or template. Add title, logline, metadata.",
    },
    {
      icon: <LayoutGrid className="h-6 w-6 lg:h-7 lg:w-7" />,
      title: "Outline",
      description:
        "Index cards for scenes. Beat board for structure. Drag to reorder.",
    },
    {
      icon: <Pencil className="h-6 w-6 lg:h-7 lg:w-7" />,
      title: "Write",
      description:
        "Type. Formatting happens automatically. Stay in flow.",
    },
    {
      icon: <Share2 className="h-6 w-6 lg:h-7 lg:w-7" />,
      title: "Collaborate",
      description:
        "Invite your co-writer. Edit together. Track every change.",
    },
    {
      icon: <Download className="h-6 w-6 lg:h-7 lg:w-7" />,
      title: "Export",
      description:
        "PDF, FDX, Fountain. Download or share a public link.",
    },
  ]

  return (
    <section id="how-it-works" className="py-16 sm:py-20 lg:py-24 scroll-mt-16 overflow-hidden bg-muted rounded-[3rem]">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 sm:space-y-3 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium">
            How it works
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto">
            Five steps from blank page to finished script
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 sm:gap-2">
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
