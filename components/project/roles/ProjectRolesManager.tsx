'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Users } from 'lucide-react'
import { normalizeRoleValue, isEmail } from './constants'
import { AddMemberForm } from './AddMemberForm'
import { PendingInvitesList } from './PendingInvitesList'
import { FilledRolesList } from './FilledRolesList'
import { UnfilledRolesList } from './UnfilledRolesList'
import type { ProjectRole, PendingInvite, GroupedMember } from './types'

interface ProjectRolesManagerProps {
  projectId: string
  roles: ProjectRole[]
  onRolesChange: (roles: ProjectRole[]) => void
}

export function ProjectRolesManager({
  projectId,
  roles,
  onRolesChange,
}: ProjectRolesManagerProps) {
  const { data: session } = useSession()
  const [isAdding, setIsAdding] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newRole, setNewRole] = useState({ role: '', name: '' })
  const [roleInput, setRoleInput] = useState('')
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Fetch pending invites
  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/role-invites`)
      if (res.ok) {
        const data = await res.json()
        setPendingInvites(data)
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error)
    }
  }, [projectId])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  const addRole = async (options?: { userId?: string; name?: string; assignSelf?: boolean }) => {
    const role = newRole.role
    if (!role) {
      toast.error('Please select a role')
      return
    }

    setIsSubmitting(true)
    try {
      const body: Record<string, unknown> = { role }

      if (options?.assignSelf) {
        body.assignSelf = true
      } else if (options?.userId) {
        body.userId = options.userId
        if (options.name) body.name = options.name
      } else if (newRole.name.trim()) {
        body.name = newRole.name.trim()
      } else {
        toast.error('Please enter a name')
        setIsSubmitting(false)
        return
      }

      const response = await fetch(`/api/projects/${projectId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add role')
      }

      const addedRole = await response.json()
      onRolesChange([...roles, addedRole])
      resetForm()
      toast.success('Team member added')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add role')
    } finally {
      setIsSubmitting(false)
    }
  }

  const sendInvite = async () => {
    const email = newRole.name.trim().toLowerCase()
    if (!newRole.role) {
      toast.error('Please select a role')
      return
    }
    if (!isEmail(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/role-invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: newRole.role }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send invite')
      }

      const invite = await response.json()
      setPendingInvites([invite, ...pendingInvites])
      resetForm()

      if (invite.inviteUrl) {
        await navigator.clipboard.writeText(invite.inviteUrl)
        toast.success('Invite created! Link copied to clipboard')
      } else {
        toast.success('Invite sent')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invite')
    } finally {
      setIsSubmitting(false)
    }
  }

  const revokeInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/role-invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to revoke invite')
      }

      setPendingInvites(pendingInvites.filter((i) => i.id !== inviteId))
      toast.success('Invite revoked')
    } catch {
      toast.error('Failed to revoke invite')
    }
  }

  const copyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/project-invite/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
    toast.success('Link copied to clipboard')
  }

  const deleteRole = async (roleId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/roles/${roleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete role')
      }

      onRolesChange(roles.filter((r) => r.id !== roleId))
      toast.success('Team member removed')
    } catch {
      toast.error('Failed to remove team member')
    }
  }

  const resetForm = () => {
    setNewRole({ role: '', name: '' })
    setRoleInput('')
    setIsAdding(false)
  }

  const handleAssignRole = (role: string) => {
    setNewRole({ role, name: '' })
    setRoleInput(role)
    setIsAdding(true)
  }

  // Group filled roles by user
  const filledRoles = roles.filter((r) => r.userId !== null)
  const groupedMembers: GroupedMember[] = Object.values(
    filledRoles.reduce(
      (acc, role) => {
        const key = role.userId!
        if (!acc[key]) {
          acc[key] = {
            user: role.user,
            name: role.name,
            userId: role.userId,
            roles: [],
            roleIds: [],
          }
        }
        acc[key].roles.push(role.role)
        acc[key].roleIds.push(role.id)
        return acc
      },
      {} as Record<string, GroupedMember>
    )
  )

  // Get truly unfilled roles
  const filledRoleTypes = new Set(filledRoles.map((r) => normalizeRoleValue(r.role)))
  const unfilledRoles = roles.filter(
    (r) => r.userId === null && !filledRoleTypes.has(normalizeRoleValue(r.role))
  )

  const memberCount = filledRoles.length
  const unfilledCount = roles.filter((r) => r.userId === null).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team
          </h3>
          <p className="text-sm text-muted-foreground">
            {memberCount} member{memberCount !== 1 ? 's' : ''}
            {unfilledCount > 0 && ` · ${unfilledCount} unfilled`}
            {pendingInvites.length > 0 && ` · ${pendingInvites.length} pending`}
          </p>
        </div>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <AddMemberForm
          onAddRole={addRole}
          onSendInvite={sendInvite}
          onCancel={resetForm}
          isSubmitting={isSubmitting}
          newRole={newRole}
          setNewRole={setNewRole}
          roleInput={roleInput}
          setRoleInput={setRoleInput}
        />
      )}

      {/* Pending Invites */}
      <PendingInvitesList
        invites={pendingInvites}
        copiedToken={copiedToken}
        onCopyLink={copyInviteLink}
        onRevoke={revokeInvite}
      />

      {/* Team List */}
      {roles.length === 0 && !isAdding && pendingInvites.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8 text-muted-foreground" />}
          title="No team members yet"
          description="Add directors, writers, producers, and other key crew members"
          action={{
            label: 'Add Member',
            onClick: () => setIsAdding(true),
            icon: <Plus className="h-4 w-4" />,
          }}
        />
      ) : (
        <>
          <FilledRolesList
            members={groupedMembers}
            currentUserId={session?.user?.id}
            onDelete={(roleIds) => roleIds.forEach((id) => deleteRole(id))}
          />
          <UnfilledRolesList
            roles={unfilledRoles}
            onAssign={handleAssignRole}
            onDelete={deleteRole}
          />
        </>
      )}
    </div>
  )
}
