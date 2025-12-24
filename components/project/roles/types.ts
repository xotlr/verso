import type { LucideIcon } from 'lucide-react'

export interface ProjectRole {
  id: string
  role: string
  name: string
  userId: string | null
  user: {
    id: string
    name: string | null
    image: string | null
  } | null
}

export interface PendingInvite {
  id: string
  email: string
  role: string
  token: string
  expiresAt: string
  inviter: {
    id: string
    name: string | null
    image: string | null
  }
}

export interface SearchUser {
  id: string
  name: string | null
  email: string
  image: string | null
}

export interface RoleDefinition {
  value: string
  label: string
  icon: LucideIcon
}

export interface GroupedMember {
  user: ProjectRole['user']
  name: string
  userId: string | null
  roles: string[]
  roleIds: string[]
}
