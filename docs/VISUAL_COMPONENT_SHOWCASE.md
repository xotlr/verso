# Visual Component Showcase

This document provides visual descriptions and use cases for each component in the enhanced landing page.

---

## Navigation Components

### Enhanced Navbar

**Visual Description:**
- Fixed at top with blur backdrop when scrolled
- Logo on left with subtle scale animation on hover
- Center navigation links with animated underline effect
- CTA buttons on right (Sign In ghost, Get Started primary)
- Mobile: Hamburger menu icon that opens bottom drawer

**States:**
- **Unscrolled**: Semi-transparent background, subtle border
- **Scrolled**: Increased blur, stronger border, shadow appears
- **Mobile Menu Open**: Full-screen drawer slides up from bottom

**Animation Details:**
- Navbar background: 200ms ease transition
- Logo hover: 200ms scale(1.1)
- Nav link underline: 200ms width expansion from 0 to 100%
- Mobile drawer: 300ms slide-up with spring easing

**Usage:**
```tsx
import { NavbarEnhanced } from "@/components/landing/navbar-enhanced"

<NavbarEnhanced />
```

---

## Hero Section

### Enhanced Hero

**Visual Description:**
- Full viewport height with aurora gradient background
- Centered content with badge, headline, subheadline, CTAs
- Rotating text animation cycles through 4 words
- Social proof avatars (gradient circles) below CTAs
- Scroll indicator at bottom (bouncing mouse)

**Layout:**
```
┌─────────────────────────────────────┐
│         Aurora Background           │
│                                     │
│         [Badge]                     │
│                                     │
│    Write your screenplay,           │
│         [rotating text]             │
│                                     │
│    Supporting paragraph text        │
│                                     │
│  [Start Writing] [See How Works]    │
│                                     │
│     ○ ○ ○ ○ ○  10,000+ writers      │
│                                     │
│            [scroll ↓]               │
└─────────────────────────────────────┘
```

**Animation Details:**
- Rotating text: 3s fade + slide transition per word
- Buttons: Lift 2px on hover, scale 98% on active
- Avatar circles: Stagger fade-in 100ms apart
- Scroll indicator: Infinite bounce animation

**Color Palette:**
- Background: Aurora gradient (dynamic WebGL)
- Text: Foreground color (dark mode aware)
- Primary CTA: Primary background with white text
- Secondary CTA: Outlined with hover fill

---

## Stats Section

### Animated Counter Cards

**Visual Description:**
- 4 stat cards in a grid (2x2 mobile, 4x1 desktop)
- Each card has icon, animated number, suffix, label
- Icons in rounded circles with primary background
- Numbers count up when scrolled into view

**Card Layout:**
```
┌──────────────────┐
│                  │
│      [icon]      │
│                  │
│    10,000+       │
│  Active Writers  │
│                  │
└──────────────────┘
```

**Animation Details:**
- Number counter: 2s ease-out from 0 to target
- Card hover: Subtle background change to accent/30
- Stagger delay: 100ms between each card
- Icon float: Lifts 4px on card hover

**Stat Examples:**
- 10,000+ Active Writers
- 50,000+ Screenplays Created
- 1,000,000+ Pages Written
- 120+ Countries

---

## Features Section

### Tabbed Feature Categories

**Visual Description:**
- Centered tab list (Writing/Production/Collaboration)
- Grid of feature cards (3 columns desktop, 2 tablet, 1 mobile)
- Each card has icon, title, description
- Cards lift and glow on hover

**Tab Interface:**
```
┌──────────────────────────────────────┐
│   Writing | Production | Collaboration│
├──────────────────────────────────────┤
│  [Card]    [Card]    [Card]          │
│  [Card]    [Card]    [Card]          │
└──────────────────────────────────────┘
```

**Feature Card Visual:**
```
┌─────────────────┐
│  [icon]↑        │
│                 │
│  Feature Title  │
│                 │
│  Description    │
│  text wraps     │
│  naturally      │
└─────────────────┘
```

**Animation Details:**
- Tab switch: 150ms opacity fade + slide
- Card entrance: Scroll-triggered fade-in with 50ms stagger
- Card hover: Lift 4px, shadow-xl, primary border glow
- Icon float: Independent 4px lift animation

**Categories:**
1. **Writing**: 6 features (formatting, focus mode, command palette, etc.)
2. **Production**: 6 features (index cards, beat board, shotlists, etc.)
3. **Collaboration**: 4 features (real-time, project management, publishing, export)

---

## How It Works Section

### Step-by-Step Process

**Visual Description:**
- Vertical timeline with 5 numbered steps
- Each step has number badge, icon, title, description
- Connector line between steps (dotted or solid)
- Scroll-triggered fade-in for each step

**Step Layout:**
```
┌──────────────────────────────┐
│  [1]  [icon]  Create Project │
│   │                          │
│   │   Description text       │
│   │                          │
│  [2]  [icon]  Organize Story │
│   │                          │
│   │   Description text       │
│   │                          │
│  [3]  ...                    │
└──────────────────────────────┘
```

**Step Number Badge:**
- Circular, primary background
- White text, 48px diameter
- Bold font, centered number

**Animation Details:**
- Step entrance: Fade-in + slide-up when 20% visible
- Connector line: Subtle pulse on scroll (optional)
- Icons: Same primary color as numbers

**Steps:**
1. Create Your Project (template selection)
2. Organize Your Story (index cards, beats)
3. Write with Industry Formatting (auto-formatting)
4. Collaborate in Real-Time (live editing)
5. Export & Share (multiple formats)

---

## Testimonials Section

### Social Proof Cards

**Visual Description:**
- 3-column grid (2 on tablet, 1 on mobile)
- 6 testimonial cards with quotes, ratings, author info
- Quote icon in top-left
- Star ratings below quote
- Author section separated by border

**Testimonial Card Visual:**
```
┌─────────────────────────────┐
│  "  ★★★★★                   │
│                             │
│  "Quote text here wraps     │
│   naturally and provides    │
│   social proof."            │
│                             │
│  ─────────────────────────  │
│  Author Name                │
│  Role, Title                │
└─────────────────────────────┘
```

**Animation Details:**
- Card entrance: Scroll-triggered with 100ms stagger
- Card hover: Subtle background change (accent/50)
- Stars: Filled primary color
- Quote icon: Primary with 20% opacity

**Layout Variations:**
- Desktop: 3 columns, equal height
- Tablet: 2 columns, masonry possible
- Mobile: 1 column, full width

**Trust Badges Below:**
- Featured in: Publications/Organizations
- Centered, gray text with subtle opacity

---

## Pricing Section

### Pricing Cards

**Visual Description:**
- 3 cards in a row (stack on mobile)
- Middle card (Pro) is highlighted and slightly larger
- Each card has name, price, features list, CTA button
- Checkmark icons for each feature

**Pricing Card Layout:**
```
┌──────────────────┐
│  [Most Popular]  │  ← Badge (Pro only)
│                  │
│  Pro             │
│  $12/month       │
│                  │
│  Description     │
│                  │
│  ✓ Feature 1     │
│  ✓ Feature 2     │
│  ✓ Feature 3     │
│                  │
│  [Button]        │
└──────────────────┘
```

**Highlighted Card (Pro):**
- Scale 105% on desktop
- Primary border color
- Subtle primary background tint
- Shadow-lg
- "Most Popular" badge at top

**Animation Details:**
- Card hover: Lift 4px, increase shadow
- Button hover: Lift 2px effect
- Card entrance: Scroll-triggered fade-in

**Pricing Tiers:**
1. **Free**: $0, 3 projects, basic features
2. **Pro**: $12/mo, unlimited, all features (highlighted)
3. **Team**: $29/mo, collaboration, team features

---

## FAQ Section

### Accordion Component

**Visual Description:**
- 8 FAQ items in a single column
- Each item is a card with question and expandable answer
- Chevron rotates when expanded
- Smooth height animation

**FAQ Item Layout:**
```
┌────────────────────────────────┐
│  Question text here?        ▼  │  ← Collapsed
└────────────────────────────────┘

┌────────────────────────────────┐
│  Question text here?        ▲  │  ← Expanded
│                                │
│  Answer text provides detail   │
│  and wraps naturally across    │
│  multiple lines.               │
└────────────────────────────────┘
```

**Animation Details:**
- Height: Grid-template-rows transition (200ms)
- Chevron: 200ms rotation (0 → 180deg)
- Opacity: Answer fades in/out simultaneously
- Hover: Subtle border color change

**Interaction:**
- Click question to toggle
- Only one item open at a time (accordion behavior)
- Touch-friendly 44px tap targets

**Support CTA:**
- Below FAQs in a muted card
- "Still have questions?" with email link

---

## CTA Section

### Final Call-to-Action

**Visual Description:**
- Full-width section with primary background
- Gradient overlay for depth
- Centered white text
- Two prominent buttons
- Trust indicator text below

**Layout:**
```
┌─────────────────────────────────┐
│    Primary Background            │
│                                  │
│    Ready to write your           │
│    masterpiece?                  │
│                                  │
│    Supporting text explains      │
│    value proposition             │
│                                  │
│  [Start Free] [View Plans]       │
│                                  │
│  No credit card required         │
└─────────────────────────────────┘
```

**Button Styling:**
- Primary button: Secondary variant (white bg)
- Secondary button: Outline with white border
- Both use btn-hover-lift effect

**Color Treatment:**
- Background: Primary color
- Text: Primary-foreground (white/light)
- Gradient: Subtle radial from top-left
- Buttons: High contrast against background

---

## Visual Design Tokens

### Shadows
```
shadow-sm:  Subtle, for resting cards
shadow-md:  Default card shadow
shadow-lg:  Hover state for cards
shadow-xl:  Featured/highlighted cards
shadow-2xl: Modals and overlays
```

### Border Radius
```
rounded-lg:   8px - Default for cards
rounded-xl:   12px - Feature cards
rounded-full: Pills, badges, avatars
```

### Spacing
```
gap-4:  16px - Tight spacing
gap-6:  24px - Default grid gap
gap-8:  32px - Loose spacing
gap-12: 48px - Section spacing
```

### Font Weights
```
font-normal:    400 - Body text
font-medium:    500 - Headings, labels
font-semibold:  600 - Emphasized text
font-bold:      700 - Special emphasis
```

---

## Responsive Breakpoints

### Mobile (<640px)
- Single column layouts
- Stacked navigation in drawer
- Full-width cards
- Larger touch targets (44px)
- Reduced font sizes

### Tablet (640-1024px)
- 2-column grids for features
- Horizontal tab navigation
- Larger typography
- Side-by-side CTAs

### Desktop (1024px+)
- 3-column feature grids
- 4-column stats
- Maximum content width: 1152px (max-w-6xl)
- Hover effects fully enabled

---

## Dark Mode Variations

All components automatically adapt to dark mode via CSS variables:

### Light Mode
- Background: Near-white (98%)
- Text: Dark gray (25%)
- Cards: Pure white
- Borders: Light gray (90%)

### Dark Mode
- Background: Near-black (8%)
- Text: Light gray (85%)
- Cards: Dark gray (10%)
- Borders: Medium-dark gray (20%)

**Shadows are stronger in dark mode** to create proper contrast.

---

## Animation Timing Reference

```
Fast:    100ms - Button clicks, quick feedback
Normal:  200ms - Default transitions, cards
Slow:    300ms - Large movements, drawers
Slower:  500ms - Page transitions, modals
```

### Easing Functions
```
ease-out:     Deceleration (most animations)
ease-in:      Acceleration (exits)
ease-in-out:  Smooth both ends (modals)
ease-spring:  Bouncy effect (playful interactions)
```

---

## Accessibility Visual Indicators

### Focus States
- 2px outline in ring color (primary at 60% opacity)
- 2px offset from element
- Visible on keyboard navigation only (focus-visible)

### Touch Targets
- Minimum 44x44px on mobile
- Visible spacing between adjacent tap areas
- Padding ensures comfortable tapping

### Reduced Motion
- All animations disabled via CSS media query
- Content remains visible and functional
- Transitions set to 1ms (imperceptible)

---

## Implementation Priority

### Phase 1 (Core)
1. Enhanced Navbar (mobile drawer)
2. Hero section improvements
3. Micro-interaction CSS utilities

### Phase 2 (Content)
4. Stats section with counters
5. Enhanced features (tabs)
6. How It Works timeline

### Phase 3 (Social Proof)
7. Testimonials section
8. Updated pricing cards
9. FAQ accordion

### Phase 4 (Polish)
10. Final CTA section
11. Footer updates
12. Performance optimization

---

## Testing Checklist

### Visual Testing
- [ ] All sections render correctly on mobile/tablet/desktop
- [ ] Animations trigger at appropriate scroll positions
- [ ] Hover states work on desktop, not on mobile
- [ ] Dark mode colors are consistent
- [ ] Text contrast meets WCAG AA

### Interactive Testing
- [ ] All buttons are clickable
- [ ] Tabs switch content correctly
- [ ] FAQ items expand/collapse smoothly
- [ ] Mobile drawer opens and closes
- [ ] Keyboard navigation works throughout

### Performance Testing
- [ ] Intersection Observers fire correctly
- [ ] No layout shift on scroll
- [ ] Animations don't cause jank
- [ ] Images lazy load appropriately
- [ ] Lighthouse score >90

---

This visual reference should help you understand exactly how each component looks, behaves, and fits into the overall landing page design.
