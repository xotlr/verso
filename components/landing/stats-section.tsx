"use client"

import { useEffect, useRef, useState } from "react"
import { Users, FileText, Zap, Globe } from "lucide-react"

interface StatItemProps {
  icon: React.ReactNode
  value: number
  suffix?: string
  label: string
  delay?: number
}

function StatItem({ icon, value, suffix = "", label, delay = 0 }: StatItemProps) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    const duration = 2000 // 2 seconds
    const steps = 60
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [isVisible, value])

  return (
    <div
      ref={ref}
      className="flex flex-col items-center text-center space-y-2 sm:space-y-3 p-4 sm:p-6 rounded-xl transition-all duration-normal hover:bg-primary-foreground/10"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="p-2 sm:p-3 rounded-full bg-primary-foreground/10 text-primary-foreground icon-float">
        {icon}
      </div>
      <div className="space-y-0.5 sm:space-y-1">
        <div className="text-2xl sm:text-4xl font-semibold tabular-nums">
          {count.toLocaleString()}
          {suffix}
        </div>
        <p className="text-xs sm:text-sm opacity-70">{label}</p>
      </div>
    </div>
  )
}

export function StatsSection() {
  return (
    <section className="py-16 sm:py-24 bg-primary text-primary-foreground">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 sm:space-y-4 mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            Trusted by storytellers worldwide
          </h2>
          <p className="text-base sm:text-lg opacity-80 max-w-2xl mx-auto px-4 sm:px-0">
            Join thousands of screenwriters bringing their stories to life with Verso
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          <StatItem
            icon={<Users className="h-6 w-6" />}
            value={10000}
            suffix="+"
            label="Active Writers"
            delay={0}
          />
          <StatItem
            icon={<FileText className="h-6 w-6" />}
            value={50000}
            suffix="+"
            label="Screenplays Created"
            delay={100}
          />
          <StatItem
            icon={<Zap className="h-6 w-6" />}
            value={1000000}
            suffix="+"
            label="Pages Written"
            delay={200}
          />
          <StatItem
            icon={<Globe className="h-6 w-6" />}
            value={120}
            suffix="+"
            label="Countries"
            delay={300}
          />
        </div>
      </div>
    </section>
  )
}
