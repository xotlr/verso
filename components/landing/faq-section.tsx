"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
}

function FAQItem({ question, answer, isOpen, onClick }: FAQItemProps) {
  return (
    <div
      className="border border-border rounded-xl bg-card overflow-hidden transition-all duration-normal hover:border-border/80"
    >
      <button
        onClick={onClick}
        className="w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-left gap-3 sm:gap-4 touch-manipulation"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-sm sm:text-base">{question}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-muted-foreground transition-transform duration-normal",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-normal",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 sm:px-6 pb-4 sm:pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {answer}
          </div>
        </div>
      </div>
    </div>
  )
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      question: "Is the free tier actually free?",
      answer:
        "Yes. Unlimited pages, unlimited screenplays, 1 project, PDF export, index cards, beat board. No credit card required. No trial period.",
    },
    {
      question: "Can I import from Final Draft?",
      answer:
        "Yes. Import from Final Draft, Fountain, Highland, Fade In, PDF, and more. Formatting carries over.",
    },
    {
      question: "Does it work offline?",
      answer:
        "Yes. Verso is a PWA. Write offline, sync when you reconnect. You can install it like a native app.",
    },
    {
      question: "How does collaboration work?",
      answer:
        "Pro plan and up. Invite collaborators by email. You both edit the same script simultaneously. Cursors visible, changes instant.",
    },
    {
      question: "What formats can I export?",
      answer:
        "PDF (free). Final Draft (FDX), Fountain, plain text (paid plans).",
    },
    {
      question: "Can I cancel anytime?",
      answer:
        "Yes. Cancel whenever. You keep access until your billing period ends. Your scripts stay accessible on the free tier.",
    },
    {
      question: "Is my work private?",
      answer:
        "Encrypted in transit and at rest. We don't read your scripts. We don't sell your data. You can delete everything anytime.",
    },
    {
      question: "Student discounts?",
      answer:
        "Yes. Email us with your .edu address. We'll set you up.",
    },
  ]

  return (
    <section id="faq" className="py-20 sm:py-32 scroll-mt-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            Questions
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground px-4 sm:px-0">
            The short answers
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        <div className="mt-8 sm:mt-12 p-4 sm:p-6 rounded-xl bg-muted/50 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
            Something else?
          </p>
          <a
            href="mailto:help@verso.ac"
            className="text-xs sm:text-sm font-medium text-primary hover:underline"
          >
            help@verso.ac
          </a>
        </div>
      </div>
    </section>
  )
}
