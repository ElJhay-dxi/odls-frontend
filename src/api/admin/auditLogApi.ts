import axiosInstance from '../axiosInstance';
import type { AuditLogPagedResult, AuditLogFilters } from '../../types/auditLog';

const BASE = '/auditlogs';

export const auditLogApi = {
  getAll: (filters: Partial<AuditLogFilters>) =>
    axiosInstance.get<AuditLogPagedResult>(BASE, {
      params: {
        tableName: filters.tableName || undefined,
        action: filters.action || undefined,
        changedBy: filters.changedBy || undefined,
        recordId: filters.recordId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 50,
      },
    }),

  getTableNames: () =>
    axiosInstance.get<string[]>(`${BASE}/tables`),
};