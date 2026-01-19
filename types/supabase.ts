/**
 * Supabase Database Types
 *
 * Auto-generated types for Supabase tables.
 * Run `npx supabase gen types typescript` to regenerate after schema changes.
 *
 * For now, this provides a basic structure matching the Prisma schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Plan enum
export type Plan = "FREE" | "PLUS" | "PRO" | "MAX"

// Team role enum
export type TeamRole = "OWNER" | "ADMIN" | "MEMBER"

// Share role enum
export type ShareRole = "VIEWER" | "COMMENTER" | "EDITOR" | "ADMIN"

// Project status enum
export type ProjectStatus = "DEVELOPMENT" | "PRE_PRODUCTION" | "PRODUCTION" | "POST_PRODUCTION" | "COMPLETED"

// Project type enum
export type ProjectType = "FEATURE_FILM" | "SHORT_FILM" | "TV_SERIES" | "STAGE_PLAY" | "OTHER"

// Screenplay type enum
export type ScreenplayType = "FILM" | "TV"

// Share permission enum
export type SharePermission = "VIEW" | "COMMENT" | "EDIT"

// Availability enum
export type Availability = "AVAILABLE" | "BUSY" | "NOT_LOOKING"

// Response rate enum
export type ResponseRate = "UNKNOWN" | "WITHIN_HOURS" | "WITHIN_DAY" | "WITHIN_WEEK" | "SLOW"

// Connection status enum
export type ConnectionStatus = "PENDING" | "ACCEPTED" | "DECLINED"

// Application status enum
export type ApplicationStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "WITHDRAWN"

// Callsheet status enum
export type CallsheetStatus = "DRAFT" | "PUBLISHED" | "COMPLETED"

// Access request status enum
export type AccessRequestStatus = "PENDING" | "APPROVED" | "DENIED"

export interface Database {
  public: {
    Tables: {
      User: {
        Row: {
          id: string
          auth_id: string | null
          name: string | null
          email: string | null
          emailVerified: string | null
          image: string | null
          password: string | null
          createdAt: string
          updatedAt: string
          username: string | null
          banner: string | null
          bio: string | null
          title: string | null
          location: string | null
          website: string | null
          twitter: string | null
          linkedin: string | null
          imdb: string | null
          oneLiner: string | null
          roles: string[]
          reelUrl: string | null
          availability: Availability
          featuredProjectId: string | null
          showcaseTimelapse: string | null
          responseRate: ResponseRate
          projectsCompleted: number
          influences: string[]
          gear: string | null
          languages: string[]
          interests: string[]
          skills: string[]
          lookingFor: string | null
          isPublic: boolean
          shortcuts: Json | null
          useCases: string[]
          plan: Plan
          stripeCustomerId: string | null
          stripeSubscriptionId: string | null
          stripePriceId: string | null
          stripeCurrentPeriodEnd: string | null
        }
        Insert: {
          id?: string
          auth_id?: string | null
          name?: string | null
          email?: string | null
          emailVerified?: string | null
          image?: string | null
          password?: string | null
          createdAt?: string
          updatedAt?: string
          username?: string | null
          banner?: string | null
          bio?: string | null
          title?: string | null
          location?: string | null
          website?: string | null
          twitter?: string | null
          linkedin?: string | null
          imdb?: string | null
          oneLiner?: string | null
          roles?: string[]
          reelUrl?: string | null
          availability?: Availability
          featuredProjectId?: string | null
          showcaseTimelapse?: string | null
          responseRate?: ResponseRate
          projectsCompleted?: number
          influences?: string[]
          gear?: string | null
          languages?: string[]
          interests?: string[]
          skills?: string[]
          lookingFor?: string | null
          isPublic?: boolean
          shortcuts?: Json | null
          useCases?: string[]
          plan?: Plan
          stripeCustomerId?: string | null
          stripeSubscriptionId?: string | null
          stripePriceId?: string | null
          stripeCurrentPeriodEnd?: string | null
        }
        Update: {
          id?: string
          auth_id?: string | null
          name?: string | null
          email?: string | null
          emailVerified?: string | null
          image?: string | null
          password?: string | null
          createdAt?: string
          updatedAt?: string
          username?: string | null
          banner?: string | null
          bio?: string | null
          title?: string | null
          location?: string | null
          website?: string | null
          twitter?: string | null
          linkedin?: string | null
          imdb?: string | null
          oneLiner?: string | null
          roles?: string[]
          reelUrl?: string | null
          availability?: Availability
          featuredProjectId?: string | null
          showcaseTimelapse?: string | null
          responseRate?: ResponseRate
          projectsCompleted?: number
          influences?: string[]
          gear?: string | null
          languages?: string[]
          interests?: string[]
          skills?: string[]
          lookingFor?: string | null
          isPublic?: boolean
          shortcuts?: Json | null
          useCases?: string[]
          plan?: Plan
          stripeCustomerId?: string | null
          stripeSubscriptionId?: string | null
          stripePriceId?: string | null
          stripeCurrentPeriodEnd?: string | null
        }
      }
      Team: {
        Row: {
          id: string
          name: string
          ownerId: string
          createdAt: string
          updatedAt: string
          banner: string | null
          logo: string | null
          description: string | null
          website: string | null
          isPublic: boolean
          stripeCustomerId: string | null
          stripeSubscriptionId: string | null
          stripePriceId: string | null
          stripeCurrentPeriodEnd: string | null
          maxSeats: number
        }
        Insert: {
          id?: string
          name: string
          ownerId: string
          createdAt?: string
          updatedAt?: string
          banner?: string | null
          logo?: string | null
          description?: string | null
          website?: string | null
          isPublic?: boolean
          stripeCustomerId?: string | null
          stripeSubscriptionId?: string | null
          stripePriceId?: string | null
          stripeCurrentPeriodEnd?: string | null
          maxSeats?: number
        }
        Update: {
          id?: string
          name?: string
          ownerId?: string
          createdAt?: string
          updatedAt?: string
          banner?: string | null
          logo?: string | null
          description?: string | null
          website?: string | null
          isPublic?: boolean
          stripeCustomerId?: string | null
          stripeSubscriptionId?: string | null
          stripePriceId?: string | null
          stripeCurrentPeriodEnd?: string | null
          maxSeats?: number
        }
      }
      TeamMember: {
        Row: {
          id: string
          teamId: string
          userId: string
          role: TeamRole
          createdAt: string
        }
        Insert: {
          id?: string
          teamId: string
          userId: string
          role?: TeamRole
          createdAt?: string
        }
        Update: {
          id?: string
          teamId?: string
          userId?: string
          role?: TeamRole
          createdAt?: string
        }
      }
      Project: {
        Row: {
          id: string
          name: string
          description: string | null
          coverImage: string | null
          banner: string | null
          logo: string | null
          type: ProjectType
          status: ProjectStatus
          createdAt: string
          updatedAt: string
          budget: number | null
          isPublic: boolean
          publishedAt: string | null
          isArchived: boolean
          isFavorite: boolean
          userId: string
          teamId: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          coverImage?: string | null
          banner?: string | null
          logo?: string | null
          type?: ProjectType
          status?: ProjectStatus
          createdAt?: string
          updatedAt?: string
          budget?: number | null
          isPublic?: boolean
          publishedAt?: string | null
          isArchived?: boolean
          isFavorite?: boolean
          userId: string
          teamId?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          coverImage?: string | null
          banner?: string | null
          logo?: string | null
          type?: ProjectType
          status?: ProjectStatus
          createdAt?: string
          updatedAt?: string
          budget?: number | null
          isPublic?: boolean
          publishedAt?: string | null
          isArchived?: boolean
          isFavorite?: boolean
          userId?: string
          teamId?: string | null
        }
      }
      Screenplay: {
        Row: {
          id: string
          title: string
          content: string
          synopsis: string | null
          createdAt: string
          updatedAt: string
          userId: string
          projectId: string | null
          teamId: string | null
          seriesId: string | null
          seasonId: string | null
          stackId: string | null
          type: ScreenplayType
          format: string
          season: number | null
          episode: number | null
          episodeTitle: string | null
          contactName: string | null
          contactEmail: string | null
          contactPhone: string | null
          contactAddress: string | null
          copyrightYear: number | null
          copyrightHolder: string | null
          registrationNumber: string | null
          draftLabel: string | null
          draftDate: string | null
          showTitlePageContact: boolean
          showTitlePageCopyright: boolean
          showTitlePageDraft: boolean
          isFavorite: boolean
          isArchived: boolean
          lastOpenedAt: string | null
          isPublic: boolean
          publishedAt: string | null
          views: number
          genre: string | null
          logline: string | null
          author: string | null
          wordCount: number
          acts: Json | null
          timelapseEnabled: boolean
          timelapseStarted: string | null
          timelapseShareId: string | null
        }
        Insert: {
          id?: string
          title: string
          content: string
          synopsis?: string | null
          createdAt?: string
          updatedAt?: string
          userId: string
          projectId?: string | null
          teamId?: string | null
          seriesId?: string | null
          seasonId?: string | null
          stackId?: string | null
          type?: ScreenplayType
          format?: string
          season?: number | null
          episode?: number | null
          episodeTitle?: string | null
          contactName?: string | null
          contactEmail?: string | null
          contactPhone?: string | null
          contactAddress?: string | null
          copyrightYear?: number | null
          copyrightHolder?: string | null
          registrationNumber?: string | null
          draftLabel?: string | null
          draftDate?: string | null
          showTitlePageContact?: boolean
          showTitlePageCopyright?: boolean
          showTitlePageDraft?: boolean
          isFavorite?: boolean
          isArchived?: boolean
          lastOpenedAt?: string | null
          isPublic?: boolean
          publishedAt?: string | null
          views?: number
          genre?: string | null
          logline?: string | null
          author?: string | null
          wordCount?: number
          acts?: Json | null
          timelapseEnabled?: boolean
          timelapseStarted?: string | null
          timelapseShareId?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string
          synopsis?: string | null
          createdAt?: string
          updatedAt?: string
          userId?: string
          projectId?: string | null
          teamId?: string | null
          seriesId?: string | null
          seasonId?: string | null
          stackId?: string | null
          type?: ScreenplayType
          format?: string
          season?: number | null
          episode?: number | null
          episodeTitle?: string | null
          contactName?: string | null
          contactEmail?: string | null
          contactPhone?: string | null
          contactAddress?: string | null
          copyrightYear?: number | null
          copyrightHolder?: string | null
          registrationNumber?: string | null
          draftLabel?: string | null
          draftDate?: string | null
          showTitlePageContact?: boolean
          showTitlePageCopyright?: boolean
          showTitlePageDraft?: boolean
          isFavorite?: boolean
          isArchived?: boolean
          lastOpenedAt?: string | null
          isPublic?: boolean
          publishedAt?: string | null
          views?: number
          genre?: string | null
          logline?: string | null
          author?: string | null
          wordCount?: number
          acts?: Json | null
          timelapseEnabled?: boolean
          timelapseStarted?: string | null
          timelapseShareId?: string | null
        }
      }
      ScreenplayShare: {
        Row: {
          id: string
          screenplayId: string
          userId: string
          role: ShareRole
          sharedBy: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          screenplayId: string
          userId: string
          role?: ShareRole
          sharedBy: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          screenplayId?: string
          userId?: string
          role?: ShareRole
          sharedBy?: string
          createdAt?: string
          updatedAt?: string
        }
      }
      ProjectShare: {
        Row: {
          id: string
          projectId: string
          userId: string
          role: ShareRole
          sharedBy: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          projectId: string
          userId: string
          role?: ShareRole
          sharedBy: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          projectId?: string
          userId?: string
          role?: ShareRole
          sharedBy?: string
          createdAt?: string
          updatedAt?: string
        }
      }
      ServiceHealthCheck: {
        Row: {
          id: string
          service: string
          status: string
          responseTime: number | null
          error: string | null
          checkedAt: string
        }
        Insert: {
          id?: string
          service: string
          status: string
          responseTime?: number | null
          error?: string | null
          checkedAt?: string
        }
        Update: {
          id?: string
          service?: string
          status?: string
          responseTime?: number | null
          error?: string | null
          checkedAt?: string
        }
      }
      UptimeRecord: {
        Row: {
          id: string
          service: string
          date: string
          uptimePercent: number
          downtimeMinutes: number
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          service: string
          date: string
          uptimePercent: number
          downtimeMinutes?: number
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          service?: string
          date?: string
          uptimePercent?: number
          downtimeMinutes?: number
          createdAt?: string
          updatedAt?: string
        }
      }
      ProcessedWebhookEvent: {
        Row: {
          id: string
          createdAt: string
        }
        Insert: {
          id: string
          createdAt?: string
        }
        Update: {
          id?: string
          createdAt?: string
        }
      }
      RoleNeed: {
        Row: {
          id: string
          projectId: string
          role: string
          description: string | null
          location: string | null
          isPaid: boolean
          isOpen: boolean
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          projectId: string
          role: string
          description?: string | null
          location?: string | null
          isPaid?: boolean
          isOpen?: boolean
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          projectId?: string
          role?: string
          description?: string | null
          location?: string | null
          isPaid?: boolean
          isOpen?: boolean
          createdAt?: string
          updatedAt?: string
        }
      }
      RoleApplication: {
        Row: {
          id: string
          roleNeedId: string
          userId: string
          message: string | null
          status: ApplicationStatus
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          roleNeedId: string
          userId: string
          message?: string | null
          status?: ApplicationStatus
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          roleNeedId?: string
          userId?: string
          message?: string | null
          status?: ApplicationStatus
          createdAt?: string
          updatedAt?: string
        }
      }
      ProjectRoleInvite: {
        Row: {
          id: string
          projectId: string
          email: string
          role: string
          token: string
          expiresAt: string
          acceptedAt: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          projectId: string
          email: string
          role: string
          token: string
          expiresAt: string
          acceptedAt?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          projectId?: string
          email?: string
          role?: string
          token?: string
          expiresAt?: string
          acceptedAt?: string | null
          createdAt?: string
        }
      }
      Incident: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string
          severity: string
          services: string[]
          startedAt: string
          resolvedAt: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status: string
          severity: string
          services?: string[]
          startedAt: string
          resolvedAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string
          severity?: string
          services?: string[]
          startedAt?: string
          resolvedAt?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
      Activity: {
        Row: {
          id: string
          userId: string
          type: string
          entityType: string
          entityId: string
          metadata: Json | null
          createdAt: string
        }
        Insert: {
          id?: string
          userId: string
          type: string
          entityType: string
          entityId: string
          metadata?: Json | null
          createdAt?: string
        }
        Update: {
          id?: string
          userId?: string
          type?: string
          entityType?: string
          entityId?: string
          metadata?: Json | null
          createdAt?: string
        }
      }
      ScreenplayOperation: {
        Row: {
          id: string
          screenplayId: string
          userId: string
          operationType: string
          position: number | null
          content: string | null
          metadata: Json | null
          timestamp: string
          sequenceNumber: number
        }
        Insert: {
          id?: string
          screenplayId: string
          userId: string
          operationType: string
          position?: number | null
          content?: string | null
          metadata?: Json | null
          timestamp?: string
          sequenceNumber?: number
        }
        Update: {
          id?: string
          screenplayId?: string
          userId?: string
          operationType?: string
          position?: number | null
          content?: string | null
          metadata?: Json | null
          timestamp?: string
          sequenceNumber?: number
        }
      }
      SidesShare: {
        Row: {
          id: string
          screenplayId: string
          token: string
          filterType: string | null
          filterValue: string | null
          callsheetId: string | null
          isActive: boolean
          expiresAt: string | null
          views: number
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          screenplayId: string
          token: string
          filterType?: string | null
          filterValue?: string | null
          callsheetId?: string | null
          isActive?: boolean
          expiresAt?: string | null
          views?: number
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          screenplayId?: string
          token?: string
          filterType?: string | null
          filterValue?: string | null
          callsheetId?: string | null
          isActive?: boolean
          expiresAt?: string | null
          views?: number
          createdAt?: string
          updatedAt?: string
        }
      }
      Shot: {
        Row: {
          id: string
          screenplayId: string
          sceneHeadingId: string
          shotNumber: string
          shotType: string | null
          frameType: string | null
          cameraAngle: string | null
          cameraMovement: string | null
          description: string | null
          duration: number | null
          status: string
          order: number
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          screenplayId: string
          sceneHeadingId: string
          shotNumber: string
          shotType?: string | null
          frameType?: string | null
          cameraAngle?: string | null
          cameraMovement?: string | null
          description?: string | null
          duration?: number | null
          status?: string
          order?: number
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          screenplayId?: string
          sceneHeadingId?: string
          shotNumber?: string
          shotType?: string | null
          frameType?: string | null
          cameraAngle?: string | null
          cameraMovement?: string | null
          description?: string | null
          duration?: number | null
          status?: string
          order?: number
          createdAt?: string
          updatedAt?: string
        }
      }
      ProjectRole: {
        Row: {
          id: string
          projectId: string
          userId: string
          role: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          projectId: string
          userId: string
          role: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          projectId?: string
          userId?: string
          role?: string
          createdAt?: string
          updatedAt?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_authenticated: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      can_access_screenplay: {
        Args: {
          p_screenplay_id: string
          p_user_id?: string
          p_min_role?: string
        }
        Returns: boolean
      }
      can_access_project: {
        Args: {
          p_project_id: string
          p_user_id?: string
          p_min_role?: string
        }
        Returns: boolean
      }
      is_team_member: {
        Args: {
          p_team_id: string
          p_user_id?: string
        }
        Returns: boolean
      }
      is_team_admin: {
        Args: {
          p_team_id: string
          p_user_id?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      Plan: Plan
      TeamRole: TeamRole
      ShareRole: ShareRole
      ProjectStatus: ProjectStatus
      ProjectType: ProjectType
      ScreenplayType: ScreenplayType
      SharePermission: SharePermission
      Availability: Availability
      ResponseRate: ResponseRate
      ConnectionStatus: ConnectionStatus
      ApplicationStatus: ApplicationStatus
      CallsheetStatus: CallsheetStatus
      AccessRequestStatus: AccessRequestStatus
    }
  }
}
