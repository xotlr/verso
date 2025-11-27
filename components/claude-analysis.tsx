'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ClaudeAnalysisProps {
  isOpen: boolean;
  screenplay: string;
  onClose: () => void;
}

type AnalysisType = 'analysis' | 'score' | 'suggestions';

export function ClaudeAnalysis({ isOpen, screenplay, onClose }: ClaudeAnalysisProps) {
  const [analysisType, setAnalysisType] = useState<AnalysisType>('analysis');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');

  const analyzeScreenplay = async () => {
    if (!apiKey && !process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY) {
      setError('Please enter your Anthropic API key');
      return;
    }

    setIsLoading(true);
    setError('');
    setAnalysis('');

    try {
      const response = await fetch('/api/claude/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'x-anthropic-api-key': apiKey })
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

  const formatAnalysis = (text: string) => {
    // Convert markdown-style formatting to HTML
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^#+\s+(.+)$/gm, '<h3 class="font-semibold text-lg mt-4 mb-2">$1</h3>')
      .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-1 mb-3">$&</ul>')
      .replace(/\n\n/g, '</p><p class="mb-3">')
      .replace(/^/, '<p class="mb-3">')
      .replace(/$/, '</p>');
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
          <DialogTitle className="text-xl">Claude AI Analysis</DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[calc(90vh-140px)]">
          {!analysis && (
            <div className="space-y-6">
              {/* API Key Input */}
              {!process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Anthropic API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Get your API key from{' '}
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Anthropic Console
                    </a>
                  </p>
                </div>
              )}

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
                    Analyzing with Claude...
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

        {/* Footer */}
        {analysis && (
          <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Analysis powered by Claude AI
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
