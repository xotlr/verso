"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Safari } from "@/components/ui/safari"

interface AppPreviewSectionProps {
  imageSrc?: string
}

export function AppPreviewSection({
  imageSrc = "/images/editor-preview.png"
}: AppPreviewSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 1], [40, -40])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.98, 1, 0.98])

  return (
    <section ref={containerRef} className="py-20 sm:py-28 overflow-hidden bg-muted">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center space-y-3 mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            See it in action
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            A clean, focused writing environment. No clutter, just your story.
          </p>
        </div>

        {/* Browser mockup with parallax */}
        <motion.div
          style={{ y, scale }}
          className="relative"
        >
          <Safari
            url="verso.app/editor"
            imageSrc={imageSrc}
            className="shadow-2xl shadow-black/5 dark:shadow-black/20"
          />
        </motion.div>
      </div>
    </section>
  )
}
