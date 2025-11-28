# Verso Feature Checklist

**Current Score: 109/170 (64%)** - Competitive Screenwriting App (Phase 5 Complete!)
**Goal: 131+ (Final Draft Killer)**

---

## Pricing & Access (3/3) - 100%

- [x] Free tier (unlimited scripts)
- [x] No forced upgrades to maintain compatibility
- [x] No "pay to unlock your own files" ever

---

## Stability & Performance (4/6) - 67%

- [ ] Zero crashes on Windows
- [ ] Zero crashes on Mac
- [ ] Zero crashes on Linux
- [ ] Handles 300+ page scripts without lag (needs virtualization)
- [x] Error boundaries, Suspense, Loading states
- [x] Rate limiting (API: 100/min, Auth: 10/15min, AI: 20/min)

---

## Platform Support (1/8) - 13%

- [ ] Native Windows app
- [ ] Native macOS app
- [ ] Native Linux app
- [x] Web app (browser-based)
- [ ] iOS app
- [ ] Android app
- [ ] Feature parity across all platforms
- [ ] Seamless sync between devices

---

## UI/UX (7/8) - 88%

- [x] Modern design (shadcn/ui, Tailwind, Radix)
- [x] Dark mode (light/dark/system)
- [x] Distraction-free writing mode (Zen mode)
- [x] Customizable interface (5 theme presets)
- [x] Keyboard shortcuts for everything
- [x] Intuitive for first-time users
- [x] Accessible (ARIA, focus management, reduced motion)
- [ ] Typing response under 16ms

---

## Core Writing Features (12/12) - 100%

- [x] Auto-formatting (scene headings, action, dialogue, etc.)
- [x] Tab/Enter element switching
- [x] Character name autocomplete
- [x] Scene heading autocomplete
- [x] Dual dialogue
- [x] Parentheticals
- [x] Transitions
- [x] Title page generation
- [x] Page locking (for production)
- [x] Revision tracking with colored pages
- [x] A/B scene numbering
- [x] Omitted scenes handling

---

## Saving & File Safety (5/8) - 63%

- [x] Auto-save (2-second debounce)
- [x] Unlimited version history
- [x] One-click restore to any version
- [ ] Offline-first (works without internet)
- [ ] Syncs when back online
- [ ] Local backup option
- [x] Cloud backup (Supabase)
- [x] Never lose more than 1 second of work (sendBeacon)

---

## Collaboration (3/11) - 27%

- [ ] Real-time co-writing (Google Docs style)
- [ ] Collaborator cursors visible
- [ ] Presence indicators (who's online)
- [ ] Comments on any line
- [ ] @mentions in comments
- [ ] Comment threading
- [ ] Resolve/unresolve comments
- [ ] Suggestion mode
- [x] Permission levels (OWNER/ADMIN/MEMBER)
- [x] Share via link
- [x] No account required to view shared scripts

---

## Organization & Outlining (7/11) - 64%

- [x] Scene navigator/sidebar
- [x] Drag-and-drop scene reordering
- [x] Beat board / corkboard view
- [x] Index cards
- [x] Color-coded scenes/beats
- [ ] Tags/labels
- [x] Act/sequence markers
- [ ] Series bible support (TV)
- [ ] Season-level outlining
- [x] Character arc tracking
- [ ] Subplot tracking

---

## Notes & Research (3/8) - 38%

- [x] Script notes (project-level)
- [ ] Script notes have search
- [ ] Script notes have spell check
- [x] General notes panel
- [ ] Research/reference attachment
- [x] Image boards (Supabase storage)
- [ ] Character profiles
- [ ] Location profiles

---

## Import & Export (7/14) - 50%

- [x] Import .fdx (Final Draft)
- [x] Import .fountain
- [ ] Import .celtx
- [ ] Import .highland
- [ ] Import .fadein
- [ ] Import PDF (OCR to screenplay)
- [ ] Import .docx
- [x] Export .fdx (perfect compatibility)
- [x] Export .fountain
- [x] Export PDF (industry standard)
- [x] Export .txt
- [x] Export .html
- [ ] Native .verso format
- [ ] Batch export

---

## Production Features (9/9) - 100%

- [x] Script breakdown (auto-detect elements)
- [x] Character report
- [x] Scene report
- [x] Location report
- [x] Dialogue statistics
- [x] Page count by character
- [x] Screen time estimates
- [x] Day/night breakdown
- [x] INT/EXT breakdown

---

## Analysis (6/6) - 100%

- [x] Script statistics (action vs dialogue)
- [x] Character dialogue balance
- [x] Scene length analysis
- [x] Pacing visualization
- [x] AI-powered analysis (Claude)
- [x] Read time estimate

---

## Search & Navigation (8/8) - 100%

- [x] Full-text search
- [x] Search by character
- [x] Search by scene heading
- [x] Search by element type
- [x] Find and replace
- [x] Regex search
- [x] Command palette navigation
- [x] Scene jumping via sidebar

---

## Formatting & Display (6/8) - 75%

- [x] Industry-standard margins
- [x] Correct Courier font
- [x] Page breaks match Final Draft exactly
- [x] Print preview
- [ ] Multiple page layouts
- [x] Custom templates
- [x] Template library (film, TV, stage play)
- [ ] Non-Latin alphabet support

---

## Mobile (0/6) - 0%

- [ ] Optimized keyboard shortcuts
- [ ] Swipe gestures for element switching
- [ ] Works offline
- [ ] Syncs instantly when online
- [ ] Doesn't drain battery
- [ ] Tablet + keyboard support

---

## Security & Privacy (3/4) - 75%

- [ ] End-to-end encryption option
- [ ] Two-factor authentication
- [x] Data export (user owns their data)
- [x] No selling user data
- [x] Zod validation + bcrypt hashing

---

## Engagement - Duolingo Angle (5/8) - 63%

- [x] Writing streaks
- [x] Daily/weekly goals (pages, words, scenes)
- [x] Progress visualization
- [ ] Milestones ("Page 30 — Act 1 done!")
- [ ] Gentle push notifications
- [ ] Satisfying sounds/haptics on scene completion
- [x] Stats dashboard
- [x] Optional — never annoying

---

## Scene Workspace (5/9) - 56%

- [x] Per-scene reference images / mood board
- [ ] Storyboard sketches attachment
- [ ] Shot ideas panel
- [x] Color palette picker
- [ ] Audio/music reference links
- [x] Tone/pacing notes
- [ ] Location photos
- [x] None of this exports to PDF
- [x] Expandable sidebar or panel per scene

---

## Marketplace (4/16) - 25%

- [x] One-click listing from finished script
- [ ] Set your terms (option price, purchase price)
- [x] Browse by genre, budget level, tone
- [ ] Filter by page count, setting, format
- [x] Buyers can read directly in browser
- [x] Track views, reads, interest
- [ ] Notifications when someone's interested
- [ ] Make/receive offers through platform
- [ ] In-app negotiation
- [ ] Secure payment processing
- [ ] Contract generation/signing
- [ ] Verso takes cut of closed deals (5-10%)
- [ ] "Featured" or premium listings option
- [ ] Analytics ("your script was read 47 times this month")
- [ ] Short film section
- [ ] Studio/production company verified accounts

---

## Projects - LinkedIn for Filmmaking (7/23) - 30%

### Core
- [x] Create project from script
- [ ] Post open roles
- [ ] Set location
- [x] Set budget/pay structure
- [x] Set timeline/availability
- [x] Attach script directly to project
- [x] Project visibility (team-based)

### Profiles
- [x] Portfolio (social links)
- [ ] Credits / experience
- [ ] Reviews from past collaborators
- [x] Skills / roles (title field)
- [x] Location
- [ ] Availability
- [ ] Rate / open to deferred

### Discovery
- [ ] Browse open projects
- [ ] Filter by role needed
- [ ] Filter by location
- [ ] Filter by genre
- [ ] Filter by pay structure
- [ ] Search by keywords

### Collaboration
- [ ] Apply to projects
- [ ] Review applicants
- [ ] In-app messaging
- [ ] Confirm crew/cast
- [ ] Track who's attached to what role
- [ ] Simple scheduling/coordination tools
- [ ] Project updates/announcements to team

---

## The "Wow" Factor (2/3) - 67%

- [x] One feature nobody else has (Character Interaction Matrix)
- [x] 10x better at one specific thing (Visual story planning)
- [ ] Makes users tell other writers about it

---

## Scoring Summary

| Score | Verdict |
|-------|---------|
| 0-60 | Keep building |
| 61-100 | Can launch beta (writing tool) |
| 101-130 | Competitive screenwriting app |
| 131-150 | Final Draft killer |
| 151-170 | The platform — writing + marketplace + projects |

**Current Total: 109 / 170**

---

## Roadmap to 131+

### Phase 1: Quick Wins (+10 pts) → 101 ✅ COMPLETE
- [x] Enable browser spell check
- [x] Add reading time estimate
- [x] Day/Night breakdown report
- [x] INT/EXT breakdown report
- [x] Implement smart quotes
- [x] Enable auto-capitalize

### Phase 2: Version History (+8 pts) → 109 ✅ COMPLETE
- [x] ScreenplayVersion model
- [x] Auto-save versions
- [x] Version list UI
- [x] One-click restore
- [x] Diff view

### Phase 3: Scene Workspace (+5 pts) → 114 ✅ COMPLETE
- [x] Per-scene attachments
- [x] Notes panel per scene
- [x] Color palette picker

### Phase 4: Enhanced Search (+4 pts) → 118 ✅ COMPLETE
- [x] Search by character
- [x] Search by scene heading
- [x] Search by element type
- [x] Regex search

### Phase 5: Production Reports (+4 pts) → 109 ✅ COMPLETE
- [x] Page count by character
- [x] Screen time estimates

### Phase 6: Import Formats (+4 pts) → 126
- [ ] Import .highland
- [ ] Import .fadein
- [ ] Batch export

### Phase 7: Mobile/PWA (+6 pts) → 132
- [ ] PWA manifest
- [ ] Service worker
- [ ] Offline support
