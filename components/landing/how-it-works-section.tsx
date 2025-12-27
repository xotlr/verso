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
    <div className="relative group">
      {/* Large background number */}
      <span className="absolute -top-4 -left-2 text-[80px] sm:text-[100px] font-bold text-muted/30 select-none leading-none pointer-events-none">
        {number}
      </span>

      {/* Content card */}
      <div className="relative pt-12 sm:pt-16">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <h3 className="text-lg sm:text-xl font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
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
    <section id="how-it-works" className="py-16 sm:py-20 lg:py-24 scroll-mt-16 overflow-hidden">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 sm:space-y-3 mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium">
            How it works
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto">
            Five steps from blank page to finished script
          </p>
        </div>

        {/* Grid layout with large background numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 sm:gap-10 lg:gap-12">
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
