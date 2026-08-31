export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: 'Create' | 'Update' | 'Delete';
  changedByName: string;
  changedByEmail: string;
  changedOn: string;
  oldValues?: string;
  newValues?: string;
}

export interface AuditLogPagedResult {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditLogFilters {
  tableName: string;
  action: string;
  changedBy: string;
  recordId: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}