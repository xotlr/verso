import type { HTMLAttributes } from "react"

export interface BrowserFrameProps extends HTMLAttributes<HTMLDivElement> {
  url?: string
  imageSrc?: string
}

export function BrowserFrame({
  imageSrc,
  url = "verso.app",
  className,
  ...props
}: BrowserFrameProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-muted ${className ?? ""}`}
      {...props}
    >
      {/* Browser toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-background border-b border-border">
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
          <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
          <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
        </div>

        {/* URL bar */}
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-md bg-muted text-xs text-muted-foreground">
            {url}
          </div>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-[54px]" />
      </div>

      {/* Content */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt=""
          className="block w-full h-auto"
        />
      )}
    </div>
  )
}
