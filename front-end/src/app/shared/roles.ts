export enum ROLES {
  LEAD = 'Leader',
  COORDINATOR = 'Coordinator',
  CONTRIBUTOR = 'Contributor',
  CoLeader = 'Co-leader',
  Financial_Focal_Point = 'Financial Focal Point',
}

export const LEAD_ROLES: ReadonlySet<string> = new Set([
  ROLES.LEAD,
  ROLES.COORDINATOR,
  ROLES.CoLeader,
  ROLES.Financial_Focal_Point,
]);

export function isLeadRole(role: string): boolean {
  return LEAD_ROLES.has(role);
}
