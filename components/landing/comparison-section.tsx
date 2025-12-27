"use client"

import { Check, X } from "lucide-react"

interface ComparisonRow {
  feature: string
  verso: boolean | string
  finalDraft: boolean | string
  highland: boolean | string
  fadeIn: boolean | string
}

const comparisonData: ComparisonRow[] = [
  {
    feature: "Price",
    verso: "Free / $12.99",
    finalDraft: "$249.99",
    highland: "$49.99",
    fadeIn: "$79.95",
  },
  {
    feature: "Browser-based",
    verso: true,
    finalDraft: false,
    highland: false,
    fadeIn: false,
  },
  {
    feature: "Real-time collaboration",
    verso: true,
    finalDraft: false,
    highland: false,
    fadeIn: false,
  },
  {
    feature: "Works offline",
    verso: true,
    finalDraft: true,
    highland: true,
    fadeIn: true,
  },
  {
    feature: "Industry formatting",
    verso: true,
    finalDraft: true,
    highland: true,
    fadeIn: true,
  },
  {
    feature: "Index cards",
    verso: true,
    finalDraft: true,
    highland: false,
    fadeIn: true,
  },
  {
    feature: "PDF export",
    verso: "Free",
    finalDraft: true,
    highland: true,
    fadeIn: true,
  },
  {
    feature: "FDX export",
    verso: "Paid",
    finalDraft: true,
    highland: true,
    fadeIn: true,
  },
]

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-xs sm:text-sm">{value}</span>
  }
  if (value) {
    return <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary mx-auto" />
  }
  return <X className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/40 mx-auto" />
}

export function ComparisonSection() {
  return (
    <section className="py-20 sm:py-32">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            How Verso compares
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Professional features without the professional price tag
          </p>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0 bg-muted rounded-3xl">
          <table className="w-full min-w-[600px] sm:min-w-0">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-4 px-4 sm:px-6 font-medium text-sm sm:text-base">
                  Feature
                </th>
                <th className="text-center py-4 px-2 sm:px-4 font-medium text-sm sm:text-base text-primary">
                  Verso
                </th>
                <th className="text-center py-4 px-2 sm:px-4 font-medium text-sm sm:text-base text-muted-foreground">
                  Final Draft
                </th>
                <th className="text-center py-4 px-2 sm:px-4 font-medium text-sm sm:text-base text-muted-foreground">
                  Highland
                </th>
                <th className="text-center py-4 px-2 sm:px-4 font-medium text-sm sm:text-base text-muted-foreground">
                  Fade In
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row) => (
                <tr
                  key={row.feature}
                >
                  <td className="py-3 sm:py-4 px-4 sm:px-6 text-sm sm:text-base">
                    {row.feature}
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
                    <CellValue value={row.verso} />
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
                    <CellValue value={row.finalDraft} />
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
                    <CellValue value={row.highland} />
                  </td>
                  <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
                    <CellValue value={row.fadeIn} />
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
