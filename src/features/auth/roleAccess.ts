import type { UserProfile } from './authTypes'

export const appRoles = {
  recruiter: 'Recruiter',
  hiringManager: 'HiringManager',
  talentAcquisitionManager: 'TalentAcquisitionManager',
  leadership: 'Leadership',
} as const

export function hasAnyRole(user: UserProfile | null, roles: string[]) {
  return Boolean(user?.roles.some((role) => roles.includes(role)))
}

export function canViewAnalytics(user: UserProfile | null) {
  return hasAnyRole(user, [appRoles.talentAcquisitionManager, appRoles.leadership])
}

export function canUseRecruitmentWrite(user: UserProfile | null) {
  return hasAnyRole(user, [appRoles.recruiter, appRoles.talentAcquisitionManager])
}
