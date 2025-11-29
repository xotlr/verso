'use client';

import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import {
  Search,
  Keyboard,
  BookOpen,
  PlayCircle,
  Rocket,
  PenTool,
  FolderOpen,
  Users,
  BarChart3,
  CreditCard,
  Bug,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import { FormattingGuideDialog } from '@/components/formatting-guide-dialog';
import { toast } from 'sonner';

// Help content data
const helpTopics = [
  {
    id: 'writing',
    title: 'Writing & Editing',
    icon: PenTool,
    items: [
      {
        title: 'Getting Started',
        content: 'Create a new screenplay by clicking "New Screenplay" in the sidebar. Choose from templates like Feature Film, TV Episode, or start with a blank page.',
      },
      {
        title: 'Auto-complete Elements',
        content: 'Press Tab to auto-complete screenplay elements. Start typing a character name or scene heading and suggestions will appear. Use arrow keys to navigate and Enter to select.',
      },
      {
        title: 'Formatting Shortcuts',
        content: 'Use keyboard shortcuts to quickly format text: Cmd/Ctrl+1 for Scene Heading, Cmd/Ctrl+2 for Action, Cmd/Ctrl+3 for Character, Cmd/Ctrl+4 for Dialogue, Cmd/Ctrl+5 for Parenthetical, Cmd/Ctrl+6 for Transition.',
      },
      {
        title: 'Focus Mode',
        content: 'Toggle Focus Mode with Cmd/Ctrl+\\ to hide the sidebar and header for distraction-free writing. Press the same shortcut to exit.',
      },
    ],
  },
  {
    id: 'projects',
    title: 'Project Management',
    icon: FolderOpen,
    items: [
      {
        title: 'Creating Projects',
        content: 'Projects help you organize related screenplays together. Create a project from the sidebar and add screenplays to it.',
      },
      {
        title: 'Moving Screenplays',
        content: 'Move a screenplay to a project by clicking the three-dot menu on the screenplay card and selecting "Move to Project".',
      },
      {
        title: 'Project Overview',
        content: 'Click on a project to see all its screenplays, add notes, and manage links to external resources.',
      },
    ],
  },
  {
    id: 'collaboration',
    title: 'Collaboration',
    icon: Users,
    items: [
      {
        title: 'Creating Teams',
        content: 'Create a team from the workspace switcher in the sidebar. Teams allow multiple people to collaborate on screenplays.',
      },
      {
        title: 'Inviting Members',
        content: 'Invite team members by email from the team settings. They\'ll receive an invitation link to join.',
      },
      {
        title: 'Publishing',
        content: 'Share your screenplay publicly by publishing it. Click "Publish" from the screenplay menu to get a shareable link.',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Screenplay Tools',
    icon: BarChart3,
    items: [
      {
        title: 'Beat Board',
        content: 'The Beat Board helps you visualize your story structure. Organize scenes into acts and track story beats.',
      },
      {
        title: 'Story Graph',
        content: 'See your screenplay\'s emotional arc and pacing with the Story Graph. Analyze scene lengths and flow.',
      },
      {
        title: 'Index Cards',
        content: 'View and rearrange scenes as index cards. Great for restructuring your screenplay at a high level.',
      },
      {
        title: 'Reports',
        content: 'Get detailed analytics about your screenplay including word count, page count, character dialogue distribution, and more.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Account & Billing',
    icon: CreditCard,
    items: [
      {
        title: 'Subscription Plans',
        content: 'Upgrade to Pro for unlimited screenplays, team collaboration, and advanced features. Visit Settings > Billing to manage your subscription.',
      },
      {
        title: 'Exporting',
        content: 'Export your screenplay as PDF, Final Draft (.fdx), or Fountain format from the editor menu.',
      },
      {
        title: 'Account Settings',
        content: 'Update your profile, change your password, and manage notification preferences in Settings.',
      },
    ],
  },
];

// Flatten topics for search
const searchableContent = helpTopics.flatMap(topic =>
  topic.items.map(item => ({
    ...item,
    topicId: topic.id,
    topicTitle: topic.title,
  }))
);

export default function HelpPage() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<string[]>(['writing']);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [formattingOpen, setFormattingOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('bug');
  const [feedbackText, setFeedbackText] = useState('');
  const [includeSystemInfo, setIncludeSystemInfo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Filter content based on search
  const filteredContent = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return searchableContent.filter(
      item =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        item.topicTitle.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev =>
      prev.includes(topicId)
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);

    // Collect system info if enabled
    const systemInfo = includeSystemInfo ? {
      browser: navigator.userAgent,
      page: pathname,
      userId: session?.user?.id,
      timestamp: new Date().toISOString(),
    } : null;

    try {
      // For now, just log and show success - you can add an API endpoint later
      console.log('Feedback submitted:', {
        type: feedbackType,
        message: feedbackText,
        systemInfo,
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setSubmitted(true);
      setFeedbackText('');
      toast.success('Thank you for your feedback!');

      // Reset after 3 seconds
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Help & Feedback</h1>
          <p className="text-muted-foreground">
            Find answers to common questions or let us know how we can improve.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Search Results */}
        {filteredContent && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">
              {filteredContent.length} result{filteredContent.length !== 1 ? 's' : ''} for "{searchQuery}"
            </h2>
            {filteredContent.length > 0 ? (
              <div className="space-y-3">
                {filteredContent.map((item, idx) => (
                  <Card key={idx} className="border-border/60">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">{item.topicTitle}</p>
                      <h3 className="font-medium mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No results found. Try a different search term.</p>
            )}
          </div>
        )}

        {/* Quick Links */}
        {!filteredContent && (
          <>
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Quick Help</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card
                  className="cursor-pointer hover:bg-accent/50 transition-colors border-border/60"
                  onClick={() => setShortcutsOpen(true)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="p-2 rounded-lg bg-blue-500/10 mb-2">
                      <Keyboard className="h-5 w-5 text-blue-500" />
                    </div>
                    <span className="text-sm font-medium">Keyboard Shortcuts</span>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:bg-accent/50 transition-colors border-border/60"
                  onClick={() => setFormattingOpen(true)}
                >
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="p-2 rounded-lg bg-purple-500/10 mb-2">
                      <BookOpen className="h-5 w-5 text-purple-500" />
                    </div>
                    <span className="text-sm font-medium">Formatting Guide</span>
                  </CardContent>
                </Card>

                <Card className="border-border/60 opacity-60">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="p-2 rounded-lg bg-green-500/10 mb-2">
                      <Rocket className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="text-sm font-medium">Getting Started</span>
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  </CardContent>
                </Card>

                <Card className="border-border/60 opacity-60">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="p-2 rounded-lg bg-orange-500/10 mb-2">
                      <PlayCircle className="h-5 w-5 text-orange-500" />
                    </div>
                    <span className="text-sm font-medium">Video Tutorials</span>
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Help Topics */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Help Topics</h2>
              <div className="space-y-2">
                {helpTopics.map((topic) => (
                  <Collapsible
                    key={topic.id}
                    open={expandedTopics.includes(topic.id)}
                    onOpenChange={() => toggleTopic(topic.id)}
                  >
                    <Card className="border-border/60">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="p-4 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-accent">
                              <topic.icon className="h-4 w-4" />
                            </div>
                            <CardTitle className="text-base">{topic.title}</CardTitle>
                          </div>
                          {expandedTopics.includes(topic.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-4 px-4">
                          <div className="space-y-4 pl-11">
                            {topic.items.map((item, idx) => (
                              <div key={idx}>
                                <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                                <p className="text-sm text-muted-foreground">{item.content}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </div>

            {/* Feedback Section */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Send Feedback</h2>
              <Card className="border-border/60">
                <CardContent className="p-6">
                  <Tabs value={feedbackType} onValueChange={setFeedbackType}>
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="bug" className="flex items-center gap-2">
                        <Bug className="h-4 w-4" />
                        <span className="hidden sm:inline">Report Bug</span>
                        <span className="sm:hidden">Bug</span>
                      </TabsTrigger>
                      <TabsTrigger value="feature" className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        <span className="hidden sm:inline">Feature Request</span>
                        <span className="sm:hidden">Feature</span>
                      </TabsTrigger>
                      <TabsTrigger value="general" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden sm:inline">General</span>
                        <span className="sm:hidden">Other</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="bug" className="space-y-4">
                      <div>
                        <Label htmlFor="bug-description">What went wrong?</Label>
                        <Textarea
                          id="bug-description"
                          placeholder="Describe the bug you encountered..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="mt-2 min-h-[120px]"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="system-info"
                          checked={includeSystemInfo}
                          onCheckedChange={(checked) => setIncludeSystemInfo(checked as boolean)}
                        />
                        <Label htmlFor="system-info" className="text-sm text-muted-foreground">
                          Include system information (browser, current page)
                        </Label>
                      </div>
                    </TabsContent>

                    <TabsContent value="feature" className="space-y-4">
                      <div>
                        <Label htmlFor="feature-description">What would you like to see?</Label>
                        <Textarea
                          id="feature-description"
                          placeholder="Describe the feature you'd like..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="mt-2 min-h-[120px]"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="general" className="space-y-4">
                      <div>
                        <Label htmlFor="general-feedback">Tell us what you think</Label>
                        <Textarea
                          id="general-feedback"
                          placeholder="Share your thoughts..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="mt-2 min-h-[120px]"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end mt-4">
                    {submitted ? (
                      <Button disabled className="gap-2">
                        <Check className="h-4 w-4" />
                        Submitted
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmitFeedback}
                        disabled={isSubmitting || !feedbackText.trim()}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <FormattingGuideDialog open={formattingOpen} onOpenChange={setFormattingOpen} />
    </main>
  );
}
