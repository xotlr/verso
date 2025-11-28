"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormattingGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FormattingGuideDialog({
  open,
  onOpenChange,
}: FormattingGuideDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Screenplay Formatting Guide</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="elements" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="elements">Elements</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[55vh] mt-4">
            <TabsContent value="elements" className="mt-0 space-y-6">
              {/* Scene Heading */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Scene Heading (Slugline)</h3>
                <p className="text-sm text-muted-foreground">
                  Indicates location and time of day. Always in CAPS.
                </p>
                <div className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm">
                  <div className="text-foreground">INT. COFFEE SHOP - DAY</div>
                  <div className="text-foreground mt-2">EXT. CITY STREET - NIGHT</div>
                </div>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li><strong>INT.</strong> = Interior (inside)</li>
                  <li><strong>EXT.</strong> = Exterior (outside)</li>
                  <li><strong>INT./EXT.</strong> = Both (e.g., car scene)</li>
                </ul>
              </div>

              {/* Action */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Action</h3>
                <p className="text-sm text-muted-foreground">
                  Describes what we see and hear. Written in present tense.
                </p>
                <div className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm">
                  <div className="text-foreground">
                    Sarah enters the crowded cafe, scanning the room. She spots an empty
                    table by the window and makes her way through the crowd.
                  </div>
                </div>
              </div>

              {/* Character */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Character Name</h3>
                <p className="text-sm text-muted-foreground">
                  Appears above dialogue, centered and in CAPS.
                </p>
                <div className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm text-center">
                  <div className="text-foreground">SARAH</div>
                </div>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li><strong>(V.O.)</strong> = Voice Over</li>
                  <li><strong>(O.S.)</strong> = Off Screen</li>
                  <li><strong>(CONT&apos;D)</strong> = Continued from previous page</li>
                </ul>
              </div>

              {/* Dialogue */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Dialogue</h3>
                <p className="text-sm text-muted-foreground">
                  The words characters speak. Centered under the character name.
                </p>
                <div className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm text-center">
                  <div className="text-foreground">SARAH</div>
                  <div className="text-foreground mt-1 max-w-[250px] mx-auto">
                    I&apos;ve been waiting for this moment my entire life.
                  </div>
                </div>
              </div>

              {/* Parenthetical */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Parenthetical</h3>
                <p className="text-sm text-muted-foreground">
                  Brief direction for how dialogue is delivered. Use sparingly.
                </p>
                <div className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm text-center">
                  <div className="text-foreground">SARAH</div>
                  <div className="text-muted-foreground">(whispering)</div>
                  <div className="text-foreground max-w-[250px] mx-auto">
                    Don&apos;t look now, but he&apos;s watching us.
                  </div>
                </div>
              </div>

              {/* Transition */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Transition</h3>
                <p className="text-sm text-muted-foreground">
                  Indicates how we move between scenes. Right-aligned, in CAPS.
                </p>
                <div className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm text-right">
                  <div className="text-foreground">CUT TO:</div>
                  <div className="text-foreground mt-2">DISSOLVE TO:</div>
                  <div className="text-foreground mt-2">FADE OUT.</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rules" className="mt-0 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Page Count</h3>
                  <p className="text-sm text-muted-foreground">
                    One properly formatted page equals approximately one minute of screen time.
                    Feature films typically run 90-120 pages.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Margins</h3>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Left margin: 1.5 inches</li>
                    <li>Right margin: 1 inch</li>
                    <li>Top/Bottom margins: 1 inch</li>
                    <li>Dialogue width: 3.5 inches</li>
                    <li>Character names: 3.7 inches from left</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Font</h3>
                  <p className="text-sm text-muted-foreground">
                    Always use <strong>Courier 12pt</strong>. This is industry standard
                    and ensures accurate page-to-time conversion.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Scene Numbers</h3>
                  <p className="text-sm text-muted-foreground">
                    Only add scene numbers for shooting scripts, not spec scripts.
                    They appear on both sides of the scene heading.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Avoid</h3>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Camera directions (unless absolutely necessary)</li>
                    <li>Excessive parentheticals</li>
                    <li>Unfilmable descriptions (thoughts, feelings)</li>
                    <li>Long action blocks (keep under 4 lines)</li>
                    <li>&quot;We see&quot; or &quot;We hear&quot; phrases</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tips" className="mt-0 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">White Space</h3>
                  <p className="text-sm text-muted-foreground">
                    Use white space generously. Dense pages are hard to read. Break up
                    long action blocks into shorter paragraphs.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Show, Don&apos;t Tell</h3>
                  <p className="text-sm text-muted-foreground">
                    Write only what can be seen or heard. Instead of &quot;Sarah feels
                    nervous,&quot; write &quot;Sarah drums her fingers on the table.&quot;
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Character Introductions</h3>
                  <p className="text-sm text-muted-foreground">
                    When a character first appears, write their name in CAPS and include
                    age and a brief description.
                  </p>
                  <div className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm">
                    <div className="text-foreground">
                      SARAH CHEN (30s), sharp eyes behind round glasses, enters
                      clutching a worn leather briefcase.
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Active Voice</h3>
                  <p className="text-sm text-muted-foreground">
                    Write in active voice and present tense. &quot;Sarah opens the door&quot;
                    not &quot;The door is opened by Sarah.&quot;
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Sound Effects</h3>
                  <p className="text-sm text-muted-foreground">
                    Write important sounds in CAPS within action lines.
                  </p>
                  <div className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm">
                    <div className="text-foreground">
                      A door SLAMS somewhere in the house. Sarah freezes.
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground">Keep It Lean</h3>
                  <p className="text-sm text-muted-foreground">
                    Every word should earn its place. Cut unnecessary adjectives and
                    adverbs. Be specific but concise.
                  </p>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
