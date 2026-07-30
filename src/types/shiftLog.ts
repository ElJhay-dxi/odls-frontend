export interface ShiftLogOfficer {
  officerId: string;
  officerName: string;
  officerDesignation: string;
}

export interface ShiftLog {
  id: string;
  plantCode: string;
  plantName: string;
  logDate: string;
  shiftCode: string;
  shiftLabel: string;
  handoverTime: string;
  handoverRemarks?: string;
  officers: ShiftLogOfficer[];          // incoming / on duty
  outgoingOfficers: ShiftLogOfficer[];  // off duty
  createdByName: string;
  createdByEmail: string;
  createdOn: string;
  updatedByName?: string;
  updatedOn?: string;
}

export interface CreateShiftLogForm {
  plantCode: string;
  logDate: string;
  shiftCode: string;
  handoverTime: string;
  handoverRemarks: string;
  officerIds: string[];
  outgoingOfficerIds: string[];
}

export interface UpdateShiftLogForm {
  handoverTime: string;
  handoverRemarks: string;
  officerIds: string[];
  outgoingOfficerIds: string[];
}

export interface ShiftOption {
  code: string;
  label: string;
}