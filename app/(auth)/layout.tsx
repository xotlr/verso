import { Aurora } from "@/components/aurora"
import { Noise } from "@/components/noise"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 -z-10">
        <Aurora speed={0.4} />
      </div>

      {/* Noise Overlay */}
      <Noise opacity={0.03} className="-z-10" />

      <div className="w-full max-w-lg p-8 relative z-10">
        {children}
      </div>
    </div>
  )
}
