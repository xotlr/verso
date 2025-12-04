# Verso Design System Quick Reference

## Animation Classes

### Button States
```tsx
// Hover lift with shadow
className="btn-hover-lift"
// On hover: lifts 2px, shadow-lg
// On active: returns to 0, shadow-sm, scale 98%
```

### Card Interactions
```tsx
// Interactive cards (features, pricing)
className="card-interactive"
// On hover: lifts 4px, shadow-xl, primary border

// Subtle hover (testimonials, FAQ)
className="card-subtle-hover"
// On hover: accent background, subtle border
```

### Icons
```tsx
// Float up on hover
className="icon-float"
// Can be on icon or parent element
```

### Scroll Animations
```tsx
// Fade in from bottom when scrolled into view
className="scroll-fade-in"
// Add "in-view" class via Intersection Observer

// Example usage:
const [isVisible, setIsVisible] = useState(false)
const ref = useRef<HTMLDivElement>(null)

useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) setIsVisible(true)
    },
    { threshold: 0.1 }
  )
  if (ref.current) observer.observe(ref.current)
  return () => observer.disconnect()
}, [])

<div ref={ref} className={cn("scroll-fade-in", isVisible && "in-view")}>
```

---

## Typography Scale

```tsx
// Hero headline
className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl"

// Section headlines
className="text-3xl sm:text-4xl"

// Subsection headlines
className="text-xl sm:text-2xl"

// Body large
className="text-lg sm:text-xl"

// Body normal
className="text-base"

// Small text
className="text-sm"
```

---

## Spacing System

### Container
```tsx
className="container max-w-6xl mx-auto px-6"
// Max widths: 3xl (768px), 4xl (896px), 5xl (1024px), 6xl (1152px)
```

### Section Padding
```tsx
className="py-24" // Standard section
className="py-32" // Large section
```

### Grid Gaps
```tsx
className="gap-4"  // Tight
className="gap-6"  // Normal
className="gap-8"  // Loose
className="gap-12" // Extra loose
```

---

## Responsive Grids

```tsx
// 1 col mobile → 2 tablet → 3 desktop
className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"

// 1 col mobile → 2 desktop
className="grid sm:grid-cols-2 gap-6"

// 2 col mobile → 4 desktop (stats)
className="grid grid-cols-2 lg:grid-cols-4 gap-6"
```

---

## Color Usage

### Text Colors
```tsx
className="text-foreground"          // Primary text
className="text-muted-foreground"    // Secondary text
className="text-primary"             // Accent/brand
className="text-destructive"         // Errors/warnings
```

### Background Colors
```tsx
className="bg-background"            // Page background
className="bg-card"                  // Card background
className="bg-muted"                 // Subtle backgrounds
className="bg-primary"               // Brand backgrounds
className="bg-accent"                // Hover states
```

### Border Colors
```tsx
className="border-border"            // Standard borders
className="border-primary"           // Accent borders
className="border-border/40"         // Subtle borders
```

---

## Button Variants

```tsx
// Primary CTA
<Button className="btn-hover-lift">Get Started</Button>

// Secondary
<Button variant="outline" className="btn-hover-lift">Learn More</Button>

// Ghost (nav items)
<Button variant="ghost">Sign In</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
```

---

## Card Patterns

### Feature Card
```tsx
<div className="p-6 rounded-xl border bg-card card-interactive">
  <div className="mb-4 text-primary icon-float">
    <Icon className="h-6 w-6" />
  </div>
  <h3 className="text-base font-medium mb-2">Title</h3>
  <p className="text-sm text-muted-foreground leading-relaxed">
    Description
  </p>
</div>
```

### Testimonial Card
```tsx
<div className="p-6 rounded-xl border bg-card card-subtle-hover">
  <blockquote className="text-sm leading-relaxed mb-4">
    Quote text
  </blockquote>
  <div className="border-t border-border/50 pt-4">
    <div className="font-medium text-sm">Author Name</div>
    <div className="text-xs text-muted-foreground">Role</div>
  </div>
</div>
```

### Pricing Card
```tsx
<div className="p-6 rounded-xl border bg-card card-interactive">
  <h3 className="text-lg font-medium">Plan Name</h3>
  <div className="text-4xl font-medium">$12</div>
  <ul className="space-y-3">
    <li className="flex items-center gap-3 text-sm">
      <Check className="h-4 w-4 text-primary" />
      Feature
    </li>
  </ul>
  <Button className="w-full btn-hover-lift">CTA</Button>
</div>
```

---

## Staggered Animations

```tsx
// Apply delay to each item in a list
{items.map((item, index) => (
  <div
    key={index}
    className="scroll-fade-in"
    style={{ transitionDelay: `${index * 100}ms` }}
  >
    {item}
  </div>
))}
```

---

## Touch Targets (Mobile)

```tsx
// Ensure 44px minimum
className="touch-manipulation min-h-[44px] min-w-[44px]"

// For links/buttons
className="px-4 py-3 rounded-lg touch-manipulation"
```

---

## Focus States

All interactive elements automatically get focus rings:
```css
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

To customize:
```tsx
className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

---

## Accessibility Patterns

### Skip Link
```tsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```

### ARIA Attributes
```tsx
// Buttons
<button aria-label="Open menu">

// Expandable content
<button aria-expanded={isOpen}>

// Loading states
<button aria-busy={isLoading}>
```

### Semantic HTML
```tsx
<header>     // Navbar
<main>       // Main content
<section>    // Content sections
<article>    // Blog posts, cards
<nav>        // Navigation menus
<footer>     // Site footer
```

---

## Common Patterns

### Section Header
```tsx
<div className="text-center space-y-4 mb-16">
  <h2 className="text-3xl sm:text-4xl font-medium">
    Section Headline
  </h2>
  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
    Supporting text that explains the section
  </p>
</div>
```

### Gradient Background
```tsx
<section className="relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
  <div className="relative z-10">
    {/* Content */}
  </div>
</section>
```

### Icon + Text
```tsx
<div className="flex items-center gap-3">
  <div className="p-2 rounded-lg bg-primary/10 text-primary">
    <Icon className="h-5 w-5" />
  </div>
  <span>Text</span>
</div>
```

---

## Performance Tips

### Intersection Observer
```tsx
// Only animate when visible
const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      setIsVisible(true)
      observer.disconnect() // Stop observing after first trigger
    }
  },
  { threshold: 0.1 } // Trigger when 10% visible
)
```

### Lazy Load Heavy Components
```tsx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>
})
```

---

## Browser DevTools Testing

### Test Animations
1. Chrome DevTools → Animations panel
2. Slow down animations to 10% or 25%
3. Verify smooth transitions

### Test Responsive
1. Chrome DevTools → Device toolbar (Cmd+Shift+M)
2. Test at: 375px (mobile), 768px (tablet), 1440px (desktop)
3. Check touch targets with "Show device frame"

### Test Accessibility
1. Lighthouse audit (Performance/Accessibility/Best Practices)
2. Tab through all interactive elements
3. Test with screen reader (VoiceOver on Mac)

### Test Reduced Motion
1. Mac: System Preferences → Accessibility → Display → Reduce motion
2. Verify all animations are disabled
3. Content should still be visible

---

## Common Gotchas

### 1. Z-Index Stacking
```
Navbar: z-50
Drawers/Modals: z-50
Tooltips: z-40
Aurora background: -z-10
```

### 2. Overflow Hidden
Avoid `overflow-hidden` on containers with hover effects that extend beyond bounds.

### 3. Pointer Events
Decorative elements should have `pointer-events-none` to avoid blocking clicks.

### 4. Hydration Errors
Use `suppressHydrationWarning` on elements that differ client/server (like theme).

---

## Quick Debug Checklist

- [ ] Does it work on mobile (< 768px)?
- [ ] Does it work with keyboard navigation?
- [ ] Does it respect reduced motion?
- [ ] Are focus states visible?
- [ ] Is text contrast sufficient (4.5:1)?
- [ ] Are touch targets 44px minimum?
- [ ] Does it work without JavaScript?
- [ ] Is the animation timing natural?

---

## Resources

- **Tailwind Docs**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/
- **Lucide Icons**: https://lucide.dev/
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **Intersection Observer**: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
