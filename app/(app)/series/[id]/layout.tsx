'use client';

interface SeriesLayoutProps {
  children: React.ReactNode;
}

export default function SeriesLayout({ children }: SeriesLayoutProps) {
  // Simple pass-through layout - all content handled by page.tsx
  return <>{children}</>;
}
