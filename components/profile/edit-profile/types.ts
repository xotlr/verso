import type { Availability, Credit } from '@/types/profile'

export interface Project {
  id: string
  name: string
  coverImage: string | null
  description: string | null
}

export interface Screenplay {
  id: string
  title: string
  timelapseShareId: string | null
}

export interface UserProfile {
  id: string
  name: string | null
  username?: string | null
  email: string | null
  image: string | null
  banner: string | null
  location: string | null
  website: string | null
  twitter: string | null
  linkedin: string | null
  imdb: string | null
  isPublic: boolean
  oneLiner?: string | null
  roles?: string[]
  reelUrl?: string | null
  availability?: Availability
  featuredProjectId?: string | null
  showcaseTimelapse?: string | null
  credits?: Credit[]
  influences?: string[]
  lookingFor?: string | null
  gear?: string | null
  languages?: string[]
  projects?: Project[]
  screenplays?: Screenplay[]
  bio?: string | null
  title?: string | null
  interests?: string[]
  skills?: string[]
}

export interface ProfileFormData {
  name: string
  username: string
  image: string
  banner: string
  location: string
  website: string
  twitter: string
  linkedin: string
  imdb: string
  isPublic: boolean
  oneLiner: string
  roles: string[]
  reelUrl: string
  availability: Availability
  featuredProjectId: string
  showcaseTimelapse: string
  influences: string[]
  lookingFor: string
  gear: string
  languages: string[]
}

export interface TabContentProps {
  formData: ProfileFormData
  onChange: (field: keyof ProfileFormData, value: string | boolean | string[]) => void
  user: UserProfile
  userId: string
}
