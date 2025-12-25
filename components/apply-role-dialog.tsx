'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2,
  Clapperboard,
  PenTool,
  Megaphone,
  Camera,
  Scissors,
  Music,
  Headphones,
  Palette,
  Users,
  User,
  MapPin,
  DollarSign,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDialogState } from '@/hooks/use-dialog-state';

// Role definitions with icons and colors
const ROLE_DEFINITIONS: {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}[] = [
  { value: 'director', label: 'Director', icon: Clapperboard, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  { value: 'writer', label: 'Writer', icon: PenTool, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { value: 'producer', label: 'Producer', icon: Megaphone, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  { value: 'executive_producer', label: 'Exec. Producer', icon: Megaphone, color: 'text-amber-600', bgColor: 'bg-amber-600/10' },
  { value: 'cinematographer', label: 'DP', icon: Camera, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { value: 'editor', label: 'Editor', icon: Scissors, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { value: 'composer', label: 'Composer', icon: Music, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  { value: 'sound_designer', label: 'Sound Designer', icon: Headphones, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  { value: 'production_designer', label: 'Production Designer', icon: Palette, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { value: 'costume_designer', label: 'Costume Designer', icon: Palette, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  { value: 'casting_director', label: 'Casting Director', icon: Users, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  { value: 'first_ad', label: '1st AD', icon: User, color: 'text-slate-500', bgColor: 'bg-slate-500/10' },
  { value: 'line_producer', label: 'Line Producer', icon: User, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { value: 'actor', label: 'Actor', icon: User, color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  { value: 'gaffer', label: 'Gaffer', icon: User, color: 'text-yellow-600', bgColor: 'bg-yellow-600/10' },
  { value: 'grip', label: 'Grip', icon: User, color: 'text-stone-500', bgColor: 'bg-stone-500/10' },
  { value: 'other', label: 'Other', icon: Briefcase, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
];

function getRoleDefinition(roleValue: string) {
  return ROLE_DEFINITIONS.find((r) => r.value === roleValue) || ROLE_DEFINITIONS[ROLE_DEFINITIONS.length - 1];
}

interface RoleNeedData {
  id: string;
  role: string;
  description: string | null;
  location: string | null;
  isPaid: boolean;
  project: {
    id: string;
    name: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
    };
  };
}

interface ApplyRoleDialogProps {
  roleNeed: RoleNeedData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplicationSubmitted?: () => void;
}

export function ApplyRoleDialog({
  roleNeed,
  open,
  onOpenChange,
  onApplicationSubmitted,
}: ApplyRoleDialogProps) {
  const [message, setMessage] = useState('');
  const { isLoading, error, setIsLoading, setError, reset } = useDialogState();

  const roleDef = roleNeed ? getRoleDefinition(roleNeed.role) : null;
  const Icon = roleDef?.icon || Briefcase;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!roleNeed) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${roleNeed.project.id}/role-needs/${roleNeed.id}/applications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: message.trim() || null }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to express interest');
        } else if (response.status === 409) {
          setError('You have already applied for this role');
        } else {
          setError(data.error || 'Failed to submit application');
        }
        return;
      }

      toast.success('Interest submitted successfully!');
      setMessage('');
      onOpenChange(false);
      onApplicationSubmitted?.();
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setMessage('');
      reset();
    }
    onOpenChange(open);
  };

  if (!roleNeed) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-md', roleDef?.bgColor)}>
              <Icon className={cn('h-4 w-4', roleDef?.color)} />
            </div>
            Express Interest
          </DialogTitle>
          <DialogDescription>
            Let the project owner know you&apos;re interested in this role.
          </DialogDescription>
        </DialogHeader>

        {/* Role Info Card */}
        <div className={cn('rounded-lg border p-4 space-y-3', roleDef?.bgColor, 'border-border/50')}>
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-foreground">{roleDef?.label}</h4>
              <Link
                href={`/project/${roleNeed.project.id}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => handleClose(false)}
              >
                {roleNeed.project.name}
              </Link>
            </div>
            <div className="flex gap-1.5">
              {roleNeed.isPaid && (
                <Badge variant="secondary" className="text-xs gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                  <DollarSign className="h-3 w-3" />
                  Paid
                </Badge>
              )}
              {roleNeed.location && (
                <Badge variant="outline" className="text-xs gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[80px]">{roleNeed.location}</span>
                </Badge>
              )}
            </div>
          </div>

          {roleNeed.description && (
            <p className="text-sm text-muted-foreground">{roleNeed.description}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={roleNeed.project.user.image || ''} />
              <AvatarFallback className="text-[10px]">
                {roleNeed.project.user.name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              Posted by {roleNeed.project.user.name || 'Unknown'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">
              Message <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="message"
              placeholder="Introduce yourself, share relevant experience, or ask questions about the role..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError(null);
              }}
              disabled={isLoading}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Your profile will be shared with the project owner.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Interest
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
