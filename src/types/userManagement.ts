export interface UserPlant {
  id: string;
  plantCode: string;
  plantName: string;
}

export interface CurrentUserProfile {
  id: string;
  fullName: string;
  email: string;
  employeeId?: string;
  designation?: string;
  roleId: string;
  roleName: string;
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
  createdOn: string;
  createdByName: string;
  plants: UserPlant[];
}