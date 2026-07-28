import { describe, it, expect } from 'vitest';
import { hasPermission, getPermissionsForRole, Permission, ALL_TEAM_ROLES } from './permissions';

describe('hasPermission', () => {
  it('grants owners every permission', () => {
    for (const permission of Object.values(Permission)) {
      expect(hasPermission('owner', permission)).toBe(true);
    }
  });

  it('grants viewers only VIEW_TEAM', () => {
    expect(hasPermission('viewer', Permission.VIEW_TEAM)).toBe(true);
    expect(hasPermission('viewer', Permission.MANAGE_TASKS)).toBe(false);
    expect(hasPermission('viewer', Permission.INVITE_MEMBERS)).toBe(false);
    expect(hasPermission('viewer', Permission.REMOVE_MEMBERS)).toBe(false);
    expect(hasPermission('viewer', Permission.DELETE_TEAM)).toBe(false);
  });

  it('lets admins invite and remove members but not manage billing or delete the team', () => {
    expect(hasPermission('admin', Permission.INVITE_MEMBERS)).toBe(true);
    expect(hasPermission('admin', Permission.REMOVE_MEMBERS)).toBe(true);
    expect(hasPermission('admin', Permission.MANAGE_BILLING)).toBe(false);
    expect(hasPermission('admin', Permission.DELETE_TEAM)).toBe(false);
  });

  it('lets members manage their own tasks but not invite or remove anyone', () => {
    expect(hasPermission('member', Permission.MANAGE_TASKS)).toBe(true);
    expect(hasPermission('member', Permission.INVITE_MEMBERS)).toBe(false);
    expect(hasPermission('member', Permission.REMOVE_MEMBERS)).toBe(false);
  });

  it('denies every permission for an unrecognized or missing role', () => {
    expect(hasPermission('nonexistent-role', Permission.VIEW_TEAM)).toBe(false);
    expect(hasPermission(undefined, Permission.VIEW_TEAM)).toBe(false);
    expect(hasPermission(null, Permission.VIEW_TEAM)).toBe(false);
  });

  it('every role in ALL_TEAM_ROLES has at least one permission defined', () => {
    for (const role of ALL_TEAM_ROLES) {
      expect(getPermissionsForRole(role).length).toBeGreaterThan(0);
    }
  });
});
