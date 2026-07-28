import type { TeamRole } from '@/lib/db/schema';

export enum Permission {
  VIEW_TEAM = 'VIEW_TEAM',
  INVITE_MEMBERS = 'INVITE_MEMBERS',
  REMOVE_MEMBERS = 'REMOVE_MEMBERS',
  CHANGE_MEMBER_ROLES = 'CHANGE_MEMBER_ROLES',
  MANAGE_BILLING = 'MANAGE_BILLING',
  MANAGE_TASKS = 'MANAGE_TASKS',
  DELETE_TEAM = 'DELETE_TEAM'
}

// Real RBAC design: a role is *defined by* the permission set it grants —
// not by an `if (role === 'owner')` check sprinkled at every call site
// (which is what this app had before: only 'owner' vs 'member', and the
// invite-permission check only existed client-side, in the form's
// `disabled` prop — the Server Action itself never verified the caller
// was allowed to invite anyone).
const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner: [
    Permission.VIEW_TEAM,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.CHANGE_MEMBER_ROLES,
    Permission.MANAGE_BILLING,
    Permission.MANAGE_TASKS,
    Permission.DELETE_TEAM
  ],
  admin: [
    Permission.VIEW_TEAM,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.MANAGE_TASKS
  ],
  member: [Permission.VIEW_TEAM, Permission.MANAGE_TASKS],
  viewer: [Permission.VIEW_TEAM]
};

export function hasPermission(
  role: string | undefined | null,
  permission: Permission
): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) {
    return false;
  }
  return ROLE_PERMISSIONS[role as TeamRole].includes(permission);
}

export function getPermissionsForRole(role: string | undefined | null): Permission[] {
  if (!role || !(role in ROLE_PERMISSIONS)) {
    return [];
  }
  return ROLE_PERMISSIONS[role as TeamRole];
}

export const ALL_TEAM_ROLES = ['owner', 'admin', 'member', 'viewer'] as const satisfies readonly TeamRole[];
