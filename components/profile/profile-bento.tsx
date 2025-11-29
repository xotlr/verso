'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Briefcase, Search } from 'lucide-react'

interface ProfileBentoProps {
  interests: string[]
  skills: string[]
  lookingFor: string | null
  isOwnProfile: boolean
  onEdit?: () => void
}

export function ProfileBento({
  interests,
  skills,
  lookingFor,
  isOwnProfile,
  onEdit,
}: ProfileBentoProps) {
  const hasContent = interests.length > 0 || skills.length > 0 || lookingFor

  // Don't render anything if no content and not own profile
  if (!hasContent && !isOwnProfile) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      {/* Interests Block */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Heart className="h-4 w-4" />
            Interests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {interests.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Badge key={interest} variant="secondary">
                  {interest}
                </Badge>
              ))}
            </div>
          ) : isOwnProfile ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onEdit}
            >
              Add interests...
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Skills Block */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            Skills & Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))}
            </div>
          ) : isOwnProfile ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onEdit}
            >
              Add skills...
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Looking For Block */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            Looking For
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lookingFor ? (
            <p className="text-sm text-foreground">{lookingFor}</p>
          ) : isOwnProfile ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onEdit}
            >
              Tell people what you&apos;re looking for...
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
