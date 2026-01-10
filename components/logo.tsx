interface LogoProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Logo({
  size = 24,
  color = "currentColor",
  className,
}: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="140 344 720 312"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* A shape */}
      <polygon
        points="320,368 452,368 452,632 308,632 164,488"
        fill={color}
      />
      {/* V shape - folded paper style */}
      <polygon
        points="500,368 620,368 620,512 764,368 836,368 572,632 500,632"
        fill={color}
      />
    </svg>
  );
}
