export interface RoleCategory {
  id?: number
  name: string
  description?: string
  entitlements?: Entitlement[]
  roles?: Role[]
}

export interface Role {
  id?: number
  name: string
  description?: string
  entitlements?: Entitlement[]
  roleCategory?: RoleCategory
}

export interface Entitlement {
  id?: number
  value: string
  entitlementTypeId: number
  entitlementType?: EntitlementType
}

export interface EntitlementType {
  id: number
  name: string
}

export interface RoleCategoryResponse {
  success: boolean
  roleCategories: RoleCategory[]
}

export interface MemberRole {
  id: number
  role: {
    name?: string
    roleCategoryId: number
  }
  roleId: number
}
