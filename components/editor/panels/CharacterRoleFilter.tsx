'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import type { CharacterRole } from '@/hooks/panels/use-character-roles';

export type RoleFilterValue = CharacterRole | 'all';

const ROLE_OPTIONS: readonly RoleFilterValue[] = [
  'all',
  'Protagonist',
  'Antagonist',
  'Supporting',
  'Minor',
] as const;

const getFilterLabel = (role: RoleFilterValue): string => {
  switch (role) {
    case 'all': return 'All';
    case 'Protagonist': return 'Lead';
    case 'Antagonist': return 'Antag';
    default: return role;
  }
};

interface CharacterRoleFilterProps {
  value: RoleFilterValue;
  onChange: (role: RoleFilterValue) => void;
}

/**
 * Role filter buttons for the characters panel.
 * Allows filtering by character role (Lead, Antagonist, Supporting, Minor).
 */
export const CharacterRoleFilter = React.memo(function CharacterRoleFilter({
  value,
  onChange,
}: CharacterRoleFilterProps) {
  return (
    <div className="flex gap-1 flex-wrap" role="group" aria-label="Filter by role">
      {ROLE_OPTIONS.map((role) => (
        <Button
          key={role}
          variant={value === role ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onChange(role)}
          className="h-7 px-2 text-[10px]"
          aria-pressed={value === role}
        >
          {getFilterLabel(role)}
        </Button>
      ))}
    </div>
  );
});
