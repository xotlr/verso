import { Eye, MessageSquare, Pencil, Shield } from 'lucide-react'

export type ShareRole = 'VIEWER' | 'COMMENTER' | 'EDITOR' | 'ADMIN'
export type LinkPermission = 'VIEW' | 'COMMENT' | 'EDIT'

export interface ShareUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export interface Share {
  id: string
  role: ShareRole
  createdAt: string
  user: ShareUser
  sharer?: { id: string; name: string | null }
}

export interface PendingInvite {
  id: string
  email: string
  role: ShareRole
  createdAt: string
  expiresAt: string
  inviter?: { id: string; name: string | null }
}

export interface ShareLink {
  id: string
  token: string
  permission: LinkPermission
  isActive: boolean
  expiresAt: string | null
  url: string
  createdAt: string
}

export const ROLE_INFO: Record<
  ShareRole,
  { label: string; description: string; icon: React.ReactNode }
> = {
  VIEWER: {
    label: 'Viewer',
    description: 'Can view only',
    icon: <Eye className="h-4 w-4" />,
  },
  COMMENTER: {
    label: 'Commenter',
    description: 'Can view and comment',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  EDITOR: {
    label: 'Editor',
    description: 'Can edit content',
    icon: <Pencil className="h-4 w-4" />,
  },
  ADMIN: {
    label: 'Admin',
    description: 'Can edit and manage sharing',
    icon: <Shield className="h-4 w-4" />,
  },
}

export const LINK_PERMISSION_INFO: Record<
  LinkPermission,
  { label: string; icon: React.ReactNode }
> = {
  VIEW: { label: 'View only', icon: <Eye className="h-4 w-4" /> },
  COMMENT: { label: 'Comment', icon: <MessageSquare className="h-4 w-4" /> },
  EDIT: { label: 'Edit', icon: <Pencil className="h-4 w-4" /> },
}

export const EXPIRATION_OPTIONS = [
  { value: 'never', label: 'Never expires' },
  { value: '1d', label: '1 day' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
]

export function getExpirationDate(value: string): string | null {
  if (value === 'never') return null
  const days = parseInt(value)
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}
