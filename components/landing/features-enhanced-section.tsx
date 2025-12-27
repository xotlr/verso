"use client"

import { useState, useEffect, useRef } from "react"
import {
  FileText,
  LayoutGrid,
  Rows3,
  Download,
  Users,
  Sparkles,
  Folder,
  Calendar,
  TrendingUp,
  Globe,
  BarChart3,
  Smartphone,
  Focus,
  Command,
  Clock,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  index?: number
}

function FeatureCard({ icon, title, description, index = 0 }: FeatureCardProps) {
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
        "p-3 sm:p-6 rounded-xl border bg-card card-interactive scroll-fade-in",
        isVisible && "in-view"
      )}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <div className="mb-2 sm:mb-4 text-primary icon-float inline-block [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">{icon}</div>
      <h3 className="text-xs sm:text-base font-medium mb-1 sm:mb-2 line-clamp-2">{title}</h3>
      <p className="text-[10px] sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 sm:line-clamp-none">
        {description}
      </p>
    </div>
  )
}

export function FeaturesEnhancedSection() {
  const writingFeatures = [
    {
      icon: <FileText className="h-6 w-6" />,
      title: "Auto-Formatting",
      description:
        "Tab. Enter. You're in dialogue. Verso formats as you type — scene headings, action, parentheticals, all of it.",
    },
    {
      icon: <Focus className="h-6 w-6" />,
      title: "Focus Mode",
      description:
        "Hide the sidebar, toolbar, everything. Just your script and a blinking cursor.",
    },
    {
      icon: <Command className="h-6 w-6" />,
      title: "Command Palette",
      description:
        "Press ⌘K. Search any command. No mouse required.",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Version History",
      description:
        "Every save is recoverable. Compare drafts side-by-side with visual diffs.",
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Mobile Editor",
      description:
        "Write on your phone. Same features, touch-optimized. Your script syncs across devices.",
    },
  ]

  const productionFeatures = [
    {
      icon: <LayoutGrid className="h-6 w-6" />,
      title: "Index Cards",
      description:
        "Drag scenes around. Reorder acts. See your structure at a glance.",
    },
    {
      icon: <Rows3 className="h-6 w-6" />,
      title: "Beat Board",
      description:
        "Plot your beats on a timeline. Track arcs across the whole script.",
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Production Tools",
      description:
        "Shotlists, schedules, budgets. All connected to your script.",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Story Graphs",
      description:
        "See when characters appear, how dialogue distributes, where tension peaks.",
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Character Tracking",
      description:
        "Who appears where. How much they talk. Auto-generated from your script.",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Analytics",
      description:
        "Page count, screen time estimates, dialogue percentages. Numbers, not guesses.",
    },
  ]

  const collaborationFeatures = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Real-Time Editing",
      description:
        "Two writers, one script, same time. See each other's cursors. No merge conflicts.",
    },
    {
      icon: <Folder className="h-6 w-6" />,
      title: "Projects",
      description:
        "Organize scripts into projects. Add metadata, tags, and notes.",
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Publish",
      description:
        "Share a public link. Let people read your work on the Explore page.",
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Export",
      description:
        "PDF, Final Draft, Fountain. Your script, your format, your file.",
    },
  ]

  return (
    <section id="features" className="py-20 sm:py-32 bg-muted/30 scroll-mt-16">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 sm:space-y-4 mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            What you get
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
            Writing, production, and collaboration tools in one place
          </p>
        </div>

        <Tabs defaultValue="writing" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8 sm:mb-12 h-10 sm:h-auto">
            <TabsTrigger value="writing" className="text-xs sm:text-sm">Writing</TabsTrigger>
            <TabsTrigger value="production" className="text-xs sm:text-sm">Production</TabsTrigger>
            <TabsTrigger value="collaboration" className="text-xs sm:text-sm">Collaboration</TabsTrigger>
          </TabsList>

          <TabsContent value="writing" className="mt-6 sm:mt-8">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {writingFeatures.map((feature, index) => (
                <FeatureCard key={index} {...feature} index={index} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="production" className="mt-6 sm:mt-8">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {productionFeatures.map((feature, index) => (
                <FeatureCard key={index} {...feature} index={index} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="collaboration" className="mt-6 sm:mt-8">
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              {collaborationFeatures.map((feature, index) => (
                <FeatureCard key={index} {...feature} index={index} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
