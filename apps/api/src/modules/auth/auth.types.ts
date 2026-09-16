export type SessionUser = {
  id: string;
  employeeCode: string | null;
  username: string | null;
  displayName: string;
  permissions: string[];
};
