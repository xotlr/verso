'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, Link2, Link2Off, RefreshCw, Calendar, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LinkPermission, ShareLink } from './types'
import { LINK_PERMISSION_INFO, EXPIRATION_OPTIONS } from './types'

interface LinkTabProps {
  shareLink: ShareLink | null
  linkPermission: LinkPermission
  linkExpiration: string
  isLoadingLink: boolean
  isSavingLink: boolean
  copied: boolean
  onPermissionChange: (permission: LinkPermission) => void
  onExpirationChange: (expiration: string) => void
  onCreateLink: () => void
  onUpdateLink: (permission: LinkPermission) => void
  onRevokeLink: () => void
  onCopyLink: () => void
  onRefreshLink: () => void
}

export function LinkTab({
  shareLink,
  linkPermission,
  linkExpiration,
  isLoadingLink,
  isSavingLink,
  copied,
  onPermissionChange,
  onExpirationChange,
  onCreateLink,
  onUpdateLink,
  onRevokeLink,
  onCopyLink,
  onRefreshLink,
}: LinkTabProps) {
  if (isLoadingLink) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!shareLink) {
    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Link2Off className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Create a link to share with anyone</p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(LINK_PERMISSION_INFO) as LinkPermission[]).map((p) => (
              <button
                key={p}
                onClick={() => onPermissionChange(p)}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                  linkPermission === p
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                {LINK_PERMISSION_INFO[p].icon}
                <span className="text-xs font-medium">{LINK_PERMISSION_INFO[p].label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Link expires</Label>
            <Select value={linkExpiration} onValueChange={onExpirationChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" onClick={onCreateLink} disabled={isSavingLink}>
            {isSavingLink ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Create Link
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Link URL */}
      <div className="space-y-2">
        <Label>Share link</Label>
        <div className="flex gap-2">
          <Input value={shareLink.url} readOnly className="text-sm font-mono" />
          <Button variant="outline" size="icon" onClick={onCopyLink}>
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Permission */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(LINK_PERMISSION_INFO) as LinkPermission[]).map((p) => (
          <button
            key={p}
            onClick={() => onUpdateLink(p)}
            disabled={isSavingLink}
            className={cn(
              'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
              shareLink.permission === p
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/30'
            )}
          >
            {LINK_PERMISSION_INFO[p].icon}
            <span className="text-xs font-medium">{LINK_PERMISSION_INFO[p].label}</span>
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Badge variant={shareLink.isActive ? 'default' : 'secondary'}>
          {shareLink.isActive ? 'Active' : 'Inactive'}
        </Badge>
        {shareLink.expiresAt && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Expires {new Date(shareLink.expiresAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onRefreshLink}
          disabled={isSavingLink}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          New Link
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="flex-1"
          onClick={onRevokeLink}
          disabled={isSavingLink}
        >
          <Link2Off className="h-4 w-4 mr-2" />
          Revoke
        </Button>
      </div>
    </div>
  )
}
