'use client';

import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VersoAnalysisProps {
  isOpen: boolean;
  screenplay: string;
  onClose: () => void;
}

type AnalysisType = 'analysis' | 'score' | 'suggestions';

export function VersoAnalysis({ isOpen, screenplay, onClose }: VersoAnalysisProps) {
  const [analysisType, setAnalysisType] = useState<AnalysisType>('analysis');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [error, setError] = useState<string>('');

  const analyzeScreenplay = async () => {
    setIsLoading(true);
    setError('');
    setAnalysis('');

    try {
      const response = await fetch('/api/verso/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          screenplay,
          analysisType
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze screenplay');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAnalysis = (text: string): string => {
    // Limit input length to prevent ReDoS attacks
    const safeText = text.length > 100000 ? text.slice(0, 100000) : text;

    // Apply markdown-like formatting with ReDoS-safe patterns
    const formatted = safeText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Use non-greedy with character class exclusion for safety
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/^#+\s+(.+)$/gm, '<h3 class="font-semibold text-lg mt-4 mb-2">$1</h3>')
      .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
      // Fixed: use non-backtracking pattern for list wrapping
      .replace(/(?:<li>[^<]*<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-1 mb-3">$&</ul>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/^/, '<p class="mb-3">')
      .replace(/$/, '</p>');

    // Sanitize with DOMPurify to prevent XSS attacks
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['p', 'strong', 'em', 'h3', 'ul', 'li'],
      ALLOWED_ATTR: ['class'],
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      // Reset state when closing
      setAnalysis('');
      setError('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-xl">Verso AI Analysis</DialogTitle>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-140px)]">
        <div className="p-6">
          {!analysis && (
            <div className="space-y-6">
              {/* Analysis Type Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Analysis Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setAnalysisType('analysis')}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-colors text-left",
                      analysisType === 'analysis'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium mb-1 text-foreground">Full Analysis</div>
                    <div className="text-sm text-muted-foreground">
                      Comprehensive screenplay breakdown
                    </div>
                  </button>
                  <button
                    onClick={() => setAnalysisType('score')}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-colors text-left",
                      analysisType === 'score'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium mb-1 text-foreground">Score & Rating</div>
                    <div className="text-sm text-muted-foreground">
                      Detailed scoring across dimensions
                    </div>
                  </button>
                  <button
                    onClick={() => setAnalysisType('suggestions')}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-colors text-left",
                      analysisType === 'suggestions'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="font-medium mb-1 text-foreground">Improvement Tips</div>
                    <div className="text-sm text-muted-foreground">
                      Specific suggestions for enhancement
                    </div>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                  {error}
                </div>
              )}

              {/* Analyze Button */}
              <Button
                onClick={analyzeScreenplay}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Analyzing with Verso...
                  </span>
                ) : (
                  'Analyze Screenplay'
                )}
              </Button>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  {analysisType === 'analysis' && 'Full Analysis'}
                  {analysisType === 'score' && 'Screenplay Score'}
                  {analysisType === 'suggestions' && 'Improvement Suggestions'}
                </h3>
                <button
                  onClick={() => {
                    setAnalysis('');
                    setError('');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  New Analysis
                </button>
              </div>
              <div
                className="text-foreground"
                dangerouslySetInnerHTML={{ __html: formatAnalysis(analysis) }}
              />
            </div>
          )}
        </div>
        </ScrollArea>

        {/* Footer */}
        {analysis && (
          <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Analysis powered by Verso AI
            </p>
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([analysis], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `screenplay-${analysisType}-${new Date().toISOString().split('T')[0]}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export Analysis
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
