export enum INITIATIVE_ROLES {
  LEAD = 'Leader',
  COORDINATOR = 'Coordinator',
  CONTRIBUTOR = 'Contributor',
  CO_LEADER = 'Co-leader',
  FINANCIAL_FOCAL_POINT = 'Financial Focal Point',
}

export const LEAD_ROLES: readonly string[] = [
  INITIATIVE_ROLES.LEAD,
  INITIATIVE_ROLES.COORDINATOR,
  INITIATIVE_ROLES.CO_LEADER,
  INITIATIVE_ROLES.FINANCIAL_FOCAL_POINT,
];

export function isLeadRole(role: string): boolean {
  return (LEAD_ROLES as readonly string[]).includes(role);
}
