'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface RequestAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  screenplayTitle: string;
}

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export function RequestAccessDialog({
  open,
  onOpenChange,
  token,
  screenplayTitle,
}: RequestAccessDialogProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('Email is required');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`/api/share/${token}/request-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        const data = await response.json();
        setErrorMessage(data.error || 'Failed to submit request');
        setStatus('error');
      }
    } catch {
      setErrorMessage('Failed to submit request. Please try again.');
      setStatus('error');
    }
  };

  const handleClose = () => {
    // Reset form when closing
    if (status === 'success') {
      setEmail('');
      setName('');
      setMessage('');
      setStatus('idle');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {status === 'success' ? (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-center">Request Sent</DialogTitle>
              <DialogDescription className="text-center">
                Your access request has been sent to the owner of &ldquo;{screenplayTitle}&rdquo;.
                You&apos;ll receive an email when they respond.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request Access</DialogTitle>
              <DialogDescription>
                Request access to &ldquo;{screenplayTitle}&rdquo;. The owner will be notified
                and can grant you permission.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={status === 'loading'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={status === 'loading'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Tell them why you'd like access..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  disabled={status === 'loading'}
                />
              </div>

              {status === 'error' && errorMessage && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {errorMessage}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={status === 'loading'}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={status === 'loading'}>
                  {status === 'loading' && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send Request
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
