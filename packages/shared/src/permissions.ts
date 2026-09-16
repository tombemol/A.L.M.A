export const PERMISSIONS = {
  USERS_READ: "users.read",
  USERS_MANAGE: "users.manage",
  ROLES_READ: "roles.read",
  ROLES_MANAGE: "roles.manage",
  ADMIN_ACCESS: "admin.access",
  CATALOG_READ: "catalog.read",
  CATALOG_MANAGE: "catalog.manage",
  LOCATIONS_READ: "locations.read",
  LOCATIONS_MANAGE: "locations.manage",
} as const;

export type PermissionCode =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
