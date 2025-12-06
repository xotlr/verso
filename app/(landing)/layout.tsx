import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ScrollArea className="h-screen">
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </ScrollArea>
  )
}
