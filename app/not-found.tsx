import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <h2 className="text-2xl font-light text-foreground/80 mb-4">Page not found</h2>
        <p className="text-muted-foreground mb-8">The screenplay you&apos;re looking for doesn&apos;t exist.</p>
        <Link
          href="/home"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}