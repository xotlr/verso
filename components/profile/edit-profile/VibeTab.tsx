'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-react'
import { COMMON_LANGUAGES } from '@/types/profile'
import type { TabContentProps } from './types'

const INFLUENCE_SUGGESTIONS = [
  'Kubrick', 'Tarantino', 'Fincher', 'Villeneuve', 'Nolan',
  'Coppola', 'Scorsese', 'Eggers', 'Aster', 'Peele',
]

export function VibeTab({ formData, onChange }: TabContentProps) {
  const [newInfluence, setNewInfluence] = useState('')
  const [newLanguage, setNewLanguage] = useState('')

  const addInfluence = (influence: string) => {
    const trimmed = influence.trim()
    if (trimmed && !formData.influences.includes(trimmed) && formData.influences.length < 3) {
      onChange('influences', [...formData.influences, trimmed])
    }
    setNewInfluence('')
  }

  const removeInfluence = (influence: string) => {
    onChange('influences', formData.influences.filter((i) => i !== influence))
  }

  const addLanguage = (language: string) => {
    const trimmed = language.trim()
    if (trimmed && !formData.languages.includes(trimmed)) {
      onChange('languages', [...formData.languages, trimmed])
    }
    setNewLanguage('')
  }

  const removeLanguage = (language: string) => {
    onChange('languages', formData.languages.filter((l) => l !== language))
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="space-y-2">
        <Label htmlFor="lookingFor">Looking For</Label>
        <Textarea
          id="lookingFor"
          value={formData.lookingFor}
          onChange={(e) => onChange('lookingFor', e.target.value)}
          placeholder="Seeking: horror shorts, paid or deferred"
          rows={2}
        />
      </div>

      <div className="space-y-3">
        <Label>Influences</Label>
        <p className="text-xs text-muted-foreground">
          3 max. Instant taste signal. ({formData.influences.length}/3)
        </p>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {formData.influences.map((influence) => (
            <Badge key={influence} variant="secondary" className="gap-1">
              {influence}
              <button type="button" onClick={() => removeInfluence(influence)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        {formData.influences.length < 3 && (
          <>
            <div className="flex gap-2">
              <Input
                value={newInfluence}
                onChange={(e) => setNewInfluence(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addInfluence(newInfluence)
                  }
                }}
                placeholder="Kubrick, Fincher..."
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addInfluence(newInfluence)} disabled={!newInfluence.trim()}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {INFLUENCE_SUGGESTIONS.filter((s) => !formData.influences.includes(s)).slice(0, 5).map((suggestion) => (
                <Button key={suggestion} type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addInfluence(suggestion)}>
                  + {suggestion}
                </Button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gear">Gear</Label>
        <Input
          id="gear"
          value={formData.gear}
          onChange={(e) => onChange('gear', e.target.value)}
          placeholder="RED Komodo, Ronin 4D, ..."
        />
        <p className="text-xs text-muted-foreground">For crew. Helps with matching.</p>
      </div>

      <div className="space-y-3">
        <Label>Languages</Label>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {formData.languages.map((language) => (
            <Badge key={language} variant="outline" className="gap-1">
              {language}
              <button type="button" onClick={() => removeLanguage(language)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Select value="" onValueChange={(value) => value && addLanguage(value)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add language" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_LANGUAGES.filter((l) => !formData.languages.includes(l)).map((language) => (
                <SelectItem key={language} value={language}>
                  {language}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={newLanguage}
            onChange={(e) => setNewLanguage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addLanguage(newLanguage)
              }
            }}
            placeholder="Other..."
            className="w-32"
          />
        </div>
      </div>
    </div>
  )
}
