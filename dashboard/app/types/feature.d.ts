// Feature Management Types

import type { Team } from '~/types/index'

// Matches GlobalSettingStatus enum from Prisma
export type FeatureStatus = 'enabled' | 'disabled' | 'beta'

/**
 * GlobalSetting model from Prisma
 * Represents a global feature flag/setting for the application
 */
export interface Feature {
  id: number
  functionName: string
  status: FeatureStatus
  teamFunctionOverrides: TeamFunctionOverride[]
  createdAt: string
  updatedAt: string
}

/**
 * TeamFunctionOverride model from Prisma
 * Represents team-specific overrides for global feature settings
 */
export interface TeamFunctionOverride {
  id: number
  teamId: number
  functionName: string
  status: FeatureStatus
  createdAt: string
  updatedAt: string
  team: Team
}

interface CreateFeaturePayload {
  functionName: string
  status: FeatureStatus
}

interface UpdateFeaturePayload {
  status: FeatureStatus
}
