"use client"

import { Check, X } from "lucide-react"

interface ComparisonRow {
  feature: string
  verso: boolean | string
  finalDraft: boolean | string
  highland: boolean | string
  fadeIn: boolean | string
  arcStudio: boolean | string
}

const comparisonData: ComparisonRow[] = [
  {
    feature: "Price",
    verso: "Free / $12.99/mo",
    finalDraft: "$249.99",
    highland: "$59.99/yr",
    fadeIn: "$79.95",
    arcStudio: "Free / $99/yr",
  },
  {
    feature: "Free screenplays",
    verso: "Unlimited",
    finalDraft: "Trial only",
    highland: "Watermarked",
    fadeIn: "Trial only",
    arcStudio: "2",
  },
  {
    feature: "No watermarks (free)",
    verso: true,
    finalDraft: false,
    highland: false,
    fadeIn: false,
    arcStudio: false,
  },
  {
    feature: "Browser-based (no install)",
    verso: true,
    finalDraft: false,
    highland: false,
    fadeIn: false,
    arcStudio: true,
  },
  {
    feature: "Timelapse & revision playback",
    verso: true,
    finalDraft: false,
    highland: false,
    fadeIn: false,
    arcStudio: false,
  },
  {
    feature: "Public writer profiles",
    verso: true,
    finalDraft: false,
    highland: false,
    fadeIn: false,
    arcStudio: true,
  },
  {
    feature: "Integrated shotlist",
    verso: true,
    finalDraft: false,
    highland: false,
    fadeIn: false,
    arcStudio: false,
  },
  {
    feature: "Project & team management",
    verso: true,
    finalDraft: "Limited",
    highland: false,
    fadeIn: false,
    arcStudio: true,
  },
  {
    feature: "Auto-save & history",
    verso: true,
    finalDraft: true,
    highland: true,
    fadeIn: true,
    arcStudio: true,
  },
  {
    feature: "Real-time collaboration",
    verso: true,
    finalDraft: true,
    highland: false,
    fadeIn: true,
    arcStudio: true,
  },
  {
    feature: "Dark mode",
    verso: true,
    finalDraft: true,
    highland: true,
    fadeIn: true,
    arcStudio: true,
  },
  {
    feature: "Works offline",
    verso: true,
    finalDraft: true,
    highland: true,
    fadeIn: true,
    arcStudio: true,
  },
  {
    feature: "Industry formatting",
    verso: true,
    finalDraft: true,
    highland: true,
    fadeIn: true,
    arcStudio: true,
  },
  {
    feature: "Index cards & outlining",
    verso: true,
    finalDraft: true,
    highland: false,
    fadeIn: true,
    arcStudio: true,
  },
  {
    feature: "PDF export",
    verso: "Free",
    finalDraft: true,
    highland: true,
    fadeIn: true,
    arcStudio: true,
  },
  {
    feature: "FDX import",
    verso: true,
    finalDraft: true,
    highland: true,
    fadeIn: true,
    arcStudio: true,
  },
  {
    feature: "FDX export",
    verso: "Paid",
    finalDraft: true,
    highland: true,
    fadeIn: true,
    arcStudio: true,
  },
  {
    feature: "Desktop app",
    verso: "Coming soon",
    finalDraft: true,
    highland: "Mac only",
    fadeIn: true,
    arcStudio: true,
  },
  {
    feature: "iPad & mobile apps",
    verso: "Coming soon",
    finalDraft: true,
    highland: true,
    fadeIn: true,
    arcStudio: true,
  },
]

function CellValue({ value, isVerso = false }: { value: boolean | string; isVerso?: boolean }) {
  if (typeof value === "string") {
    return <span className="text-xs sm:text-sm">{value}</span>
  }
  if (value) {
    return <Check className={`h-4 w-4 sm:h-5 sm:w-5 mx-auto ${isVerso ? "text-primary-foreground" : "text-primary"}`} />
  }
  return <X className={`h-4 w-4 sm:h-5 sm:w-5 mx-auto ${isVerso ? "text-primary-foreground/40" : "text-muted-foreground/40"}`} />
}

export function ComparisonSection() {
  return (
    <section className="py-20 sm:py-32">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            How Verso compares
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional features without the professional price tag
          </p>
        </div>

        {/* Mobile: Stacked cards */}
        <div className="md:hidden space-y-3">
          {comparisonData.map((row) => (
            <div
              key={row.feature}
              className="bg-muted rounded-xl p-4"
            >
              <div className="font-medium text-sm mb-3">{row.feature}</div>
              <div className="grid grid-cols-5 gap-1 text-xs">
                <div className="flex flex-col items-center gap-1 py-2">
                  <span className="text-muted-foreground text-[10px]">Final Draft</span>
                  <CellValue value={row.finalDraft} />
                </div>
                <div className="flex flex-col items-center gap-1 py-2">
                  <span className="text-muted-foreground text-[10px]">Highland</span>
                  <CellValue value={row.highland} />
                </div>
                <div className="flex flex-col items-center gap-1 py-2">
                  <span className="text-muted-foreground text-[10px]">Fade In</span>
                  <CellValue value={row.fadeIn} />
                </div>
                <div className="flex flex-col items-center gap-1 py-2">
                  <span className="text-muted-foreground text-[10px]">Arc Studio</span>
                  <CellValue value={row.arcStudio} />
                </div>
                <div className="flex flex-col items-center gap-1 bg-primary text-primary-foreground rounded-lg py-2">
                  <span className="font-medium text-[10px]">Verso</span>
                  <CellValue value={row.verso} isVerso />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block bg-muted rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-5 px-6 font-medium text-base">
                  Feature
                </th>
                <th className="text-center py-5 px-4 font-medium text-base text-primary-foreground bg-primary">
                  Verso
                </th>
                <th className="text-center py-5 px-4 font-medium text-base text-muted-foreground">
                  Final Draft
                </th>
                <th className="text-center py-5 px-4 font-medium text-base text-muted-foreground">
                  Highland
                </th>
                <th className="text-center py-5 px-4 font-medium text-base text-muted-foreground">
                  Fade In
                </th>
                <th className="text-center py-5 px-4 font-medium text-base text-muted-foreground">
                  Arc Studio
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, index) => (
                <tr key={row.feature}>
                  <td className="py-4 px-6 text-base">
                    {row.feature}
                  </td>
                  <td className={`py-4 px-4 text-center bg-primary text-primary-foreground ${index === comparisonData.length - 1 ? "rounded-b-2xl" : ""}`}>
                    <CellValue value={row.verso} isVerso />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <CellValue value={row.finalDraft} />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <CellValue value={row.highland} />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <CellValue value={row.fadeIn} />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <CellValue value={row.arcStudio} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
