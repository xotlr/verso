import { Aurora } from "@/components/aurora"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 -z-10">
        <Aurora speed={0.4} />
      </div>

      <div className="w-full max-w-lg p-8 relative z-10">
        {children}
      </div>
    </div>
  )
}
