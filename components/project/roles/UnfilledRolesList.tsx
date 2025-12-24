'use client'

import { Button } from '@/components/ui/button'
import { UserPlus, Trash2 } from 'lucide-react'
import { getRoleIcon, getRoleLabel } from './constants'
import type { ProjectRole } from './types'

interface UnfilledRolesListProps {
  roles: ProjectRole[]
  onAssign: (role: string) => void
  onDelete: (roleId: string) => void
}

export function UnfilledRolesList({ roles, onAssign, onDelete }: UnfilledRolesListProps) {
  if (roles.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <UserPlus className="h-4 w-4" />
        Unfilled Roles
      </h4>
      <div className="border border-dashed border-border rounded-lg divide-y divide-dashed divide-border">
        {roles.map((role) => {
          const Icon = getRoleIcon(role.role)
          return (
            <div key={role.id} className="group flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-md border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium text-sm text-muted-foreground">
                    {getRoleLabel(role.role)}
                  </div>
                  <div className="text-xs text-muted-foreground/70">Looking for talent</div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onAssign(role.role)}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Assign
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(role.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
