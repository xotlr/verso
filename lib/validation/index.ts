/**
 * Centralized validation schemas.
 *
 * @example
 * import { createScreenplaySchema, type CreateScreenplayInput } from '@/lib/validation';
 *
 * const data = createScreenplaySchema.parse(requestBody);
 */

// Primitive validators
export {
  // ID schemas
  cuidSchema,
  uuidSchema,
  idSchema,
  // String schemas
  titleSchema,
  descriptionSchema,
  shortTextSchema,
  slugSchema,
  // Contact schemas
  emailSchema,
  urlSchema,
  phoneSchema,
  // Pagination
  paginationSchema,
  // Date schemas
  dateStringSchema,
  yearSchema,
  // Helpers
  nullableOptional,
  // Types
  type Cuid,
  type Title,
  type Description,
  type Email,
  type Url,
  type Pagination,
} from './primitives';

// Screenplay schemas
export {
  // Enums
  screenplayTypeSchema,
  screenplayFormatSchema,
  // Schemas
  titlePageFieldsSchema,
  createScreenplaySchema,
  updateScreenplaySchema,
  listScreenplaysQuerySchema,
  screenplayMetadataSchema,
  // Types
  type ScreenplayType,
  type ScreenplayFormat,
  type TitlePageFields,
  type CreateScreenplayInput,
  type UpdateScreenplayInput,
  type ListScreenplaysQuery,
  type ScreenplayMetadata,
} from './screenplay';

// Project schemas
export {
  // Enums
  projectStatusSchema,
  projectTypeSchema,
  // Schemas
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
  moveProjectToTeamSchema,
  // Types
  type ProjectStatus,
  type ProjectType,
  type CreateProjectInput,
  type UpdateProjectInput,
  type ListProjectsQuery,
  type MoveProjectToTeamInput,
} from './project';

// Team schemas
export {
  // Enums
  teamRoleSchema,
  teamPlanSchema,
  // Schemas
  createTeamSchema,
  updateTeamSchema,
  inviteTeamMemberSchema,
  updateTeamMemberSchema,
  listTeamsQuerySchema,
  listTeamMembersQuerySchema,
  // Types
  type TeamRole,
  type TeamPlan,
  type CreateTeamInput,
  type UpdateTeamInput,
  type InviteTeamMemberInput,
  type UpdateTeamMemberInput,
  type ListTeamsQuery,
  type ListTeamMembersQuery,
} from './team';
