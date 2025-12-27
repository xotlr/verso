"use client";

import { motion, Easing } from "framer-motion";
import { cn } from "@/lib/utils";

const easeTransition: Easing = [0.25, 0.1, 0.25, 1];

interface UseCase {
  name: string;
  description: string;
}

const useCases: UseCase[] = [
  {
    name: "Film",
    description:
      "From 5-page shorts to 300+ page epics. Pre-production breakdowns, industry-standard formatting, and the tools to take your script from concept to screen.",
  },
  {
    name: "TV",
    description:
      "Organize entire series with season planners, episode management, and character tracking. See your whole show at a glance.",
  },
];

export function UseCasesSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <h2 className="mb-6 sm:mb-8 text-2xl sm:text-3xl md:text-4xl font-medium text-center">
          Every story has a format
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {useCases.map((useCase, index) => (
            <motion.div
              key={index}
              className="group relative overflow-hidden rounded-xl bg-muted border border-border/50 cursor-pointer"
              whileHover="hover"
              initial="initial"
            >
              {/* Default state: Icon + heading */}
              <motion.div
                variants={{
                  initial: {
                    opacity: 1,
                    clipPath: "inset(0% 0% 0% 0%)",
                  },
                  hover: {
                    opacity: 0,
                    clipPath: "inset(0% 0% 100% 0%)",
                  },
                }}
                transition={{ duration: 0.4, ease: easeTransition }}
                className="relative z-0 flex min-h-[18rem] sm:min-h-[22rem] md:min-h-[26rem] flex-col items-center justify-center p-6 sm:p-8"
              >
                <h3 className={cn(
                  "uppercase text-primary/80 text-center",
                  useCase.name === "Film"
                    ? "font-bodoni text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-light"
                    : "font-plaster text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] tracking-wide"
                )}>
                  {useCase.name}
                </h3>
              </motion.div>

              {/* Primary overlay - slides up from bottom */}
              <motion.div
                className="absolute inset-0 z-10 bg-primary"
                variants={{
                  initial: { y: "100%" },
                  hover: { y: "0%" },
                }}
                transition={{ duration: 0.4, ease: easeTransition }}
                style={{ willChange: "transform" }}
              />

              {/* Hover state: Description */}
              <motion.div
                variants={{
                  initial: { opacity: 0, y: 20 },
                  hover: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.4, ease: easeTransition }}
                className="absolute inset-0 z-20 flex min-h-[18rem] sm:min-h-[22rem] md:min-h-[26rem] items-start justify-center p-6 sm:p-8 md:p-10 text-primary-foreground"
              >
                <div className="space-y-2 sm:space-y-3 text-left max-w-md pt-6 sm:pt-8">
                  <p className={cn(
                    "opacity-90 uppercase",
                    useCase.name === "Film"
                      ? "font-bodoni text-2xl sm:text-3xl md:text-4xl font-light"
                      : "font-plaster text-2xl sm:text-3xl md:text-4xl tracking-wide"
                  )}>
                    {useCase.name}
                  </p>
                  <p className="text-sm sm:text-base md:text-lg leading-relaxed opacity-90">
                    {useCase.description}
                  </p>
                </div>
              </motion.div>

            </motion.div>
          ))}
        </div>

        {/* Coming soon teaser */}
        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-3 text-muted-foreground">
          <div className="h-px flex-1 bg-border/50" />
          <p className="text-xs sm:text-sm tracking-widest uppercase">
            More formats coming soon
          </p>
          <div className="h-px flex-1 bg-border/50" />
        </div>
      </div>
    </section>
  );
}
