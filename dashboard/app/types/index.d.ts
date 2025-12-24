import type { AvatarProps } from '@nuxt/ui'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export interface User {
  id: number
  name: string
  email: string
  avatar?: AvatarProps
  status: UserStatus
  location: string
}

export interface Mail {
  id: number
  unread?: boolean
  from: User
  subject: string
  body: string
  date: string
}

export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}

export interface Notification {
  id: number
  unread?: boolean
  sender: User
  body: string
  date: string
}

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}

export interface Team {
  id: number
  name: string
  description: string | null
  ownerAddress: string
  officerAddress: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    members: number
  }
}

// Statistics API Types
export type StatsPeriod = '7d' | '30d' | '90d' | 'all'

export interface StatsOverview {
  totalTeams: number
  activeTeams: number
  totalMembers: number
  totalClaims: number
  totalHoursWorked: number
  totalWeeklyClaims: number
  weeklyClaimsByStatus: Record<string, number>
  totalExpenses: number
  expensesByStatus: Record<string, number>
  totalNotifications: number
  notificationReadRate: number
  totalContracts: number
  contractsByType: Record<string, number>
  totalActions: number
  actionsExecutionRate: number
  growthMetrics: {
    teamsGrowth: number
    membersGrowth: number
    claimsGrowth: number
  }
  period: string
}

export interface TeamStats {
  totalTeams: number
  activeTeams: number
  avgMembersPerTeam: number
  teamsWithOfficer: number
  topTeamsByMembers: Array<{
    id: number
    name: string
    description: string | null
    memberCount: number
    createdAt: string
  }>
  period: string
  pagination: {
    page: number
    limit: number
    totalPages: number
  }
}

export interface UserStats {
  totalUsers: number
  activeUsers: number
  avgTeamsPerUser: number
  multiTeamUsers: number
  period: string
  pagination: {
    page: number
    limit: number
  }
}

export interface ClaimsStats {
  totalClaims: number
  totalHoursWorked: number
  avgHoursPerClaim: number
  claimsByTeam: Array<{
    teamId: number
    teamName: string
    claimCount: number
    totalHours: number
  }>
  period: string
}

export interface WagesStats {
  totalWages: number
  averageRates: {
    cash: number
    token: number
    usdc: number
  }
  wageDistribution: {
    cash: number
    token: number
    usdc: number
  }
  membersWithWages: number
  percentageWithWages: number
  period: string
}

export interface ExpensesStats {
  totalExpenses: number
  expensesByStatus: Record<string, number>
  expensesByTeam: Array<{
    teamId: number
    teamName: string
    expenseCount: number
    signedCount: number
    expiredCount: number
  }>
  period: string
  pagination: {
    page: number
    limit: number
  }
}

export interface ContractsStats {
  totalContracts: number
  contractsByType: Record<string, number>
  avgContractsPerTeam: number
  period: string
}

export interface ActionsStats {
  totalActions: number
  executedActions: number
  executionRate: number
  actionsByTeam: Array<{
    teamId: number
    teamName: string
    actionCount: number
    executedCount: number
    executionRate: number
  }>
  period: string
  pagination: {
    page: number
    limit: number
  }
}

export interface Activity {
  type: 'claim' | 'expense' | 'action' | 'contract'
  id: number
  description: string
  user: {
    address: string
    name: string | null
  }
  team: {
    id: number
    name: string
  }
  status: string | null
  createdAt: string
}

export interface RecentActivity {
  activities: Activity[]
  total: number
}

// Feature Management Types
export type FeatureStatus = 'enabled' | 'disabled' | 'beta'

export interface Feature {
  functionName: string
  status: FeatureStatus
  isGloballyRestricted?: boolean
  overridesCount: number
  createdAt: string
  updatedAt: string
}

export interface FeatureOverride {
  teamId: number
  teamName: string
  status: FeatureStatus
  createdAt: string
  updatedAt: string
}

export interface TeamFunctionOverride {
  id: number
  teamId: number
  functionName: string
  status: string
  createdAt: string
  updatedAt: string
  team?: {
    id: number
    name: string
  }
}

export interface FeatureDetail extends Omit<Feature, 'overridesCount'> {
  id?: number
  overrides?: FeatureOverride[]
  teamFunctionOverrides?: TeamFunctionOverride[]
}

export interface TeamRestrictionOverride {
  teamId: number
  teamName: string
  isRestricted: boolean
  memberCount?: number
  updatedAt?: string
}
