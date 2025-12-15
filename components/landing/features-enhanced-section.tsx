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
  Brain,
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
      title: "Industry-Standard Formatting",
      description:
        "Automatic screenplay formatting that follows Hollywood standards. Just write, we handle the rest.",
    },
    {
      icon: <Focus className="h-6 w-6" />,
      title: "Focus Mode",
      description:
        "Distraction-free writing environment inspired by the best minimal editors. Hide everything but your words.",
    },
    {
      icon: <Command className="h-6 w-6" />,
      title: "Command Palette",
      description:
        "Lightning-fast keyboard-driven navigation. Access any feature without touching your mouse.",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Version History",
      description:
        "Unlimited version history with visual diff view. Never lose a draft, easily compare revisions.",
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "AI Analysis",
      description:
        "Verso-powered screenplay analysis. Get intelligent feedback on pacing, dialogue, and structure.",
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Mobile Writing",
      description:
        "Full-featured mobile editor with touch-optimized toolbar. Write anywhere, on any device.",
    },
  ]

  const productionFeatures = [
    {
      icon: <LayoutGrid className="h-6 w-6" />,
      title: "Index Cards",
      description:
        "Organize scenes visually with drag-and-drop index cards. Perfect for outlining and restructuring.",
    },
    {
      icon: <Rows3 className="h-6 w-6" />,
      title: "Beat Board",
      description:
        "Map out story beats and see the big picture. Track character arcs and plot points.",
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Production Tools",
      description:
        "Shotlists, shooting schedules, budgets, and crew role assignments all in one place.",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Story Visualization",
      description:
        "Interactive story graphs, character timelines, and contribution heatmaps reveal narrative patterns.",
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Character Tracking",
      description:
        "Automatic character appearance tracking, dialogue statistics, and relationship mapping.",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Analytics Dashboard",
      description:
        "Word counts, screen time estimates, dialogue distribution, and productivity metrics.",
    },
  ]

  const collaborationFeatures = [
    {
      icon: <Users className="h-6 w-6" />,
      title: "Real-Time Collaboration",
      description:
        "Write together in real-time. Perfect for writing partners, rooms, and production teams.",
    },
    {
      icon: <Folder className="h-6 w-6" />,
      title: "Project Management",
      description:
        "Multi-project organization with templates, tags, and customizable metadata.",
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Publishing Platform",
      description:
        "Share your work publicly on the Explore page. Build an audience and get discovered.",
    },
    {
      icon: <Download className="h-6 w-6" />,
      title: "Universal Export",
      description:
        "Export to PDF, Final Draft (FDX), Fountain, and more. Your screenplay, your format.",
    },
  ]

  return (
    <section id="features" className="py-20 sm:py-32 bg-muted/30 scroll-mt-16">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 sm:space-y-4 mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            Everything you need to write
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
            Powerful features designed for every stage of the screenwriting process
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
