import { Injectable } from '@angular/core';
import { UserService } from '../services/user.service';
import { isLeadRole } from './roles';

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  constructor(private userService: UserService) {}

  /** Returns true if the logged-in user has the admin role. */
  isAdmin(): boolean {
    return this.userService.getLogedInUser()?.role === 'admin';
  }

  /** Delegates to the shared isLeadRole helper. */
  isLeadRole(roleName: string): boolean {
    return isLeadRole(roleName);
  }

  /**
   * Finds the current user's role object from the initiative's roles array.
   * Returns the role object or null if not found.
   */
  getUserInitiativeRole(initiative: any): any | null {
    const currentUser = this.userService.getLogedInUser();
    const userId = currentUser?.id ?? null;
    if (userId == null) {
      return null;
    }
    const roles: any[] = Array.isArray(initiative?.roles) ? initiative.roles : [];
    return roles.find((r: any) => r?.user_id === userId) ?? null;
  }

  /**
   * Returns true if the current user is allowed to submit the given initiative.
   * Returns false when submissionStatus is 'Pending' or 'Approved'.
   */
  canSubmit(initiative: any, submissionStatus: string): boolean {
    if (submissionStatus === 'Pending' || submissionStatus === 'Approved') {
      return false;
    }
    if (this.isAdmin()) {
      return true;
    }
    const userRole = this.getUserInitiativeRole(initiative);
    if (!userRole) {
      return false;
    }
    return isLeadRole(userRole.role);
  }

  /**
   * Returns true if the current user can edit the given center.
   * Locked submission statuses always return false.
   */
  canEditCenter(initiative: any, centerCode: string, submissionStatus: string): boolean {
    if (submissionStatus === 'Pending' || submissionStatus === 'Approved') {
      return false;
    }
    if (this.isAdmin()) {
      return true;
    }
    const userRole = this.getUserInitiativeRole(initiative);
    if (!userRole) {
      return false;
    }
    if (isLeadRole(userRole.role)) {
      return true;
    }
    // Contributor: check if centerCode is among assigned organizations
    const assignedCodes = new Set<string>(
      (userRole.organizations || []).map((o: any) => String(o?.code))
    );
    return assignedCodes.has(String(centerCode));
  }

  /**
   * Builds a map of centerKey → boolean for all centers using the same
   * permission logic as canEditCenter, but optimised (role computed once).
   */
  buildCanEditMap(
    initiative: any,
    centers: any[],
    submissionStatus: string
  ): Record<string, boolean> {
    const map: Record<string, boolean> = {};
    const isLocked =
      submissionStatus === 'Pending' || submissionStatus === 'Approved';

    if (isLocked) {
      centers.forEach((center: any) => {
        const key = this.getCenterKey(center);
        if (key != null) {
          map[key] = false;
        }
      });
      return map;
    }

    if (this.isAdmin()) {
      centers.forEach((center: any) => {
        const key = this.getCenterKey(center);
        if (key != null) {
          map[key] = true;
        }
      });
      return map;
    }

    const userRole = this.getUserInitiativeRole(initiative);

    if (!userRole) {
      centers.forEach((center: any) => {
        const key = this.getCenterKey(center);
        if (key != null) {
          map[key] = false;
        }
      });
      return map;
    }

    if (isLeadRole(userRole.role)) {
      centers.forEach((center: any) => {
        const key = this.getCenterKey(center);
        if (key != null) {
          map[key] = true;
        }
      });
    } else {
      // Contributor: can only edit assigned centers
      const assignedCodes = new Set<string>(
        (userRole.organizations || []).map((o: any) => String(o?.code))
      );
      centers.forEach((center: any) => {
        const key = this.getCenterKey(center);
        if (key != null) {
          map[key] = assignedCodes.has(key);
        }
      });
    }

    return map;
  }

  /**
   * Returns true if the current user can manage team members for the initiative.
   */
  canManageTeam(initiative: any): boolean {
    if (this.isAdmin()) {
      return true;
    }
    const userRole = this.getUserInitiativeRole(initiative);
    if (!userRole) {
      return false;
    }
    return isLeadRole(userRole.role);
  }

  /**
   * Derives the canonical string key for a center object.
   * Mirrors the getCenterKey logic in porb.component.ts.
   */
  private getCenterKey(center: any): string | null {
    if (!center) {
      return null;
    }
    const raw = center?.code ?? center?.id ?? center?.organization_code;
    if (raw == null) {
      return null;
    }
    if (typeof raw === 'object') {
      const nested = raw?.code ?? raw?.id ?? raw?.organization_code;
      return nested != null ? String(nested) : null;
    }
    return String(raw);
  }
}
