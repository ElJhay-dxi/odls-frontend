export interface UserPlant {
  id: string;
  plantCode: string;
  plantName: string;
  classificationType: string;
}

export interface CurrentUserProfile {
  id: string;
  fullName: string;
  email: string;
  employeeId?: string;
  designation?: string;
  phoneNumber?: string | null;
  roleId: string;
  roleName: string;
  roleDescription?: string | null;
  /** When the account was set up */
  createdOn?: string;
  /** 'Active' | 'Pending' (signed in, waiting for an admin) | 'Declined'. Only Active users get into the app. */
  status?: UserAccessStatus;
  requestedOn?: string | null;
  requestedPlantCodes?: string[];
  requestNote?: string | null;
  declineReason?: string | null;
  isAdmin: boolean;
  permissions: string[]; // list of permission codes
  plants: UserPlant[];
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  group: string;
  description?: string;
  displayOrder: number;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  createdOn: string;
  createdByName: string;
  permissions: Permission[];
}

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  employeeId?: string;
  designation?: string;
  phoneNumber?: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  status: UserAccessStatus;
  requestedOn?: string | null;
  requestedPlantCodes: string[];
  requestNote?: string | null;
  reviewedByName?: string | null;
  reviewedOn?: string | null;
  declineReason?: string | null;
  createdOn: string;
  createdByName: string;
  plants: UserPlant[];
}

export type UserAccessStatus = 'Active' | 'Pending' | 'Declined';

/** Built-in role held by users still waiting for access — never offered when assigning roles. */
export const NO_ACCESS_ROLE = 'No Access';

export interface PlantOption {
  plantCode: string;
  plantName: string;
  classificationType: string;
}