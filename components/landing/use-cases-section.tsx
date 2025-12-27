"use client";

import { motion, Easing } from "framer-motion";

const easeTransition: Easing = [0.25, 0.1, 0.25, 1];

interface UseCase {
  name: string;
  description: string;
}

const useCases: UseCase[] = [
  {
    name: "Film",
    description:
      "Feature films, shorts, and indie projects. Industry-standard formatting that producers and readers expect.",
  },
  {
    name: "Television",
    description:
      "Series, pilots, and episodic content. Track seasons, episodes, and character arcs across your show.",
  },
];

export function UseCasesSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <h2 className="mb-8 sm:mb-12 text-2xl sm:text-3xl md:text-4xl font-medium text-center">
          Built for every format
        </h2>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {useCases.map((useCase, index) => (
            <motion.div
              key={index}
              className="group relative overflow-hidden rounded-lg bg-primary cursor-pointer"
              whileHover="hover"
              initial="initial"
            >
              {/* Default state: Just heading */}
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
                className="relative z-0 flex min-h-[20rem] sm:min-h-[24rem] flex-col items-center justify-center p-8"
              >
                <h3 className="text-2xl sm:text-3xl font-medium text-primary-foreground">
                  {useCase.name}
                </h3>
              </motion.div>

              {/* White overlay - slides up from bottom */}
              <motion.div
                className="absolute inset-0 z-10 bg-white dark:bg-zinc-100"
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
                className="absolute inset-0 z-20 flex min-h-[20rem] sm:min-h-[24rem] items-center justify-center p-8 text-zinc-900"
              >
                <div className="space-y-3 text-center max-w-sm">
                  <p className="text-sm font-medium opacity-60 uppercase tracking-wider">
                    {useCase.name}
                  </p>
                  <p className="text-base sm:text-lg leading-relaxed">
                    {useCase.description}
                  </p>
                </div>
              </motion.div>

            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
