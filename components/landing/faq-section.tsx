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
      question: "Is Verso really free to use?",
      answer:
        "Yes! Verso's Free plan includes up to 3 projects with full access to industry-standard formatting, index cards, beat boards, and PDF export. You can upgrade to Pro for unlimited projects and advanced features whenever you're ready.",
    },
    {
      question: "Can I import my existing screenplay?",
      answer:
        "Absolutely. Verso supports importing from Final Draft (FDX), Fountain, and plain text formats. We'll automatically convert your screenplay to our format while preserving all formatting and structure.",
    },
    {
      question: "Does Verso work offline?",
      answer:
        "Yes! Verso is a Progressive Web App (PWA) that works fully offline. Your work syncs automatically when you're back online, and you can even install it on your device like a native app.",
    },
    {
      question: "How does real-time collaboration work?",
      answer:
        "With Team or Pro plans, you can invite collaborators to your projects. Multiple people can write simultaneously, see each other's cursors and changes in real-time, and chat inline. Perfect for writing rooms and co-writing partnerships.",
    },
    {
      question: "What export formats do you support?",
      answer:
        "Verso exports to PDF (with or without watermarks), Final Draft (FDX), Fountain markdown, and plain text. Pro users get access to all formats, while Free users can export to PDF.",
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer:
        "Yes, you can cancel your Pro or Team subscription at any time. You'll retain access to all features until the end of your billing period, and your projects will remain accessible on the Free plan.",
    },
    {
      question: "Is my screenplay data secure and private?",
      answer:
        "Your work is encrypted in transit and at rest. We use industry-standard security practices and never share your content with third parties. You own your work completely, and you can delete it at any time.",
    },
    {
      question: "Do you offer educational or non-profit discounts?",
      answer:
        "Yes! We offer significant discounts for students, educators, and non-profit organizations. Contact us with your institutional email for verification and we'll set you up with special pricing.",
    },
  ]

  return (
    <section id="faq" className="py-20 sm:py-32 scroll-mt-16">
      <div className="container max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-3 sm:space-y-4 mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            Frequently asked questions
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground px-4 sm:px-0">
            Everything you need to know about Verso
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
            Still have questions?
          </p>
          <a
            href="mailto:support@verso.app"
            className="text-xs sm:text-sm font-medium text-primary hover:underline"
          >
            Contact our support team
          </a>
        </div>
      </div>
    </section>
  )
}
