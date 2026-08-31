import {
  Box, Card, CardContent, CardHeader, TextField, Button,
  CircularProgress, Alert, Typography, Chip, Stack, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, Tooltip, FormControl, InputLabel,
  Select, MenuItem, Collapse, Pagination,
} from '@mui/material';
import {
  Search, ExpandMore, ExpandLess, Refresh,
  AdminPanelSettings, FilterList,
} from '@mui/icons-material';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '../../components/shared/PageHeader';
import { auditLogApi } from '../../api/admin/auditLogApi';
import type { AuditLog, AuditLogPagedResult } from '../../types/auditLog';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';

const ACTION_COLORS: Record<string, 'success' | 'warning' | 'error'> = {
  Create: 'success',
  Update: 'warning',
  Delete: 'error',
};

const formatTableName = (name: string) =>
  name.replace(/([A-Z])/g, ' $1').trim().replace(/^./, (c) => c.toUpperCase());

const formatJson = (json?: string) => {
  if (!json) return null;
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
};

export default function AuditLogPage() {
  const { hasPermission } = useUser();
  const navigate = useNavigate();
  const isAdmin = hasPermission('admin.audit.view');

  const [result, setResult] = useState<AuditLogPagedResult | null>(null);
  const [tableNames, setTableNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterTable, setFilterTable] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterChangedBy, setFilterChangedBy] = useState('');
  const [filterRecordId, setFilterRecordId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // Expanded rows for JSON diffs
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    auditLogApi.getTableNames().then((res) => setTableNames(res.data));
  }, []);

  const fetchLogs = useCallback(async (p = page) => {
    setLoading(true); setError(null);
    try {
      const res = await auditLogApi.getAll({
        tableName: filterTable, action: filterAction,
        changedBy: filterChangedBy, recordId: filterRecordId,
        dateFrom: filterDateFrom, dateTo: filterDateTo,
        page: p, pageSize: PAGE_SIZE,
      });
      setResult(res.data);
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false); }
  }, [filterTable, filterAction, filterChangedBy, filterRecordId, filterDateFrom, filterDateTo, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSearch = () => { setPage(1); fetchLogs(1); };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    fetchLogs(value);
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasDiff = (log: AuditLog) => !!(log.oldValues || log.newValues);

  if (!isAdmin) return (
    <Box>
      <PageHeader title="Audit Log" subtitle="System activity log"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Audit Log' }]} />
      <Alert severity="error" sx={{ mt: 2 }}
        action={<Button color="error" size="small" variant="outlined" onClick={() => navigate(-1)}>Go Back</Button>}>
        You do not have permission to view audit logs.
      </Alert>
    </Box>
  );

  return (
    <Box>
      <PageHeader title="Audit Log" subtitle="Full history of all create, update and delete actions across the system"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Audit Log' }]} />

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <FilterList sx={{ color: 'text.secondary', fontSize: '1.2rem' }} />
              <Typography sx={{ fontWeight: 700 }}>Filters</Typography>
            </Stack>
          }
          action={
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<Refresh />}
                onClick={() => {
                  setFilterTable(''); setFilterAction(''); setFilterChangedBy('');
                  setFilterRecordId(''); setFilterDateFrom(''); setFilterDateTo('');
                  setPage(1); fetchLogs(1);
                }}>
                Clear
              </Button>
              <Button size="small" variant="contained" startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Search />}
                onClick={handleSearch} disabled={loading}>
                {loading ? 'Loading...' : 'Search'}
              </Button>
            </Stack>
          }
        />
        <Divider />
        <CardContent>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {/* Table */}
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Table</InputLabel>
                <Select label="Table" value={filterTable} onChange={(e) => setFilterTable(e.target.value)}>
                  <MenuItem value="">All Tables</MenuItem>
                  {tableNames.map((t) => (
                    <MenuItem key={t} value={t}>{formatTableName(t)}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Action */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Action</InputLabel>
                <Select label="Action" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="Create">Create</MenuItem>
                  <MenuItem value="Update">Update</MenuItem>
                  <MenuItem value="Delete">Delete</MenuItem>
                </Select>
              </FormControl>

              {/* Changed By */}
              <TextField size="small" label="Changed By" sx={{ minWidth: 200 }}
                value={filterChangedBy} onChange={(e) => setFilterChangedBy(e.target.value)}
                placeholder="Name or email" />

              {/* Record ID */}
              <TextField size="small" label="Record ID" sx={{ minWidth: 200 }}
                value={filterRecordId} onChange={(e) => setFilterRecordId(e.target.value)}
                placeholder="UUID of specific record" />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }} useFlexGap>
              {/* Date From */}
              <TextField size="small" label="Date From" type="date" sx={{ minWidth: 180 }}
                value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />

              {/* Date To */}
              <TextField size="small" label="Date To" type="date" sx={{ minWidth: 180 }}
                value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader
          title={
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <AdminPanelSettings sx={{ color: 'text.secondary' }} />
              <Typography sx={{ fontWeight: 700 }}>Activity Log</Typography>
              {result && (
                <Chip label={`${result.total.toLocaleString()} records`} size="small" variant="outlined" />
              )}
            </Stack>
          }
        />
        <Divider />
        <CardContent sx={{ p: 0 }}>
          {error && <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>{error}</Alert>}

          {loading && !result ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : result?.items.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" color="text.secondary">No audit log entries found.</Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 700, width: 160 }}>Timestamp</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 80 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Table</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Changed By</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 300 }}>Record ID</TableCell>
                      <TableCell sx={{ width: 50 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result?.items.map((log) => (
                      <>
                        <TableRow
                          key={log.id}
                          hover
                          sx={{ cursor: hasDiff(log) ? 'pointer' : 'default' }}
                          onClick={() => hasDiff(log) && toggleRow(log.id)}
                        >
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                              {new Date(log.changedOn).toLocaleString('en-GB', {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                              })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.action}
                              size="small"
                              color={ACTION_COLORS[log.action] ?? 'default'}
                              variant="filled"
                              sx={{ fontWeight: 700, fontSize: 11 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatTableName(log.tableName)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{log.changedByName}</Typography>
                            <Typography variant="caption" color="text.secondary">{log.changedByEmail}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: 11 }}>
                              {log.recordId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {hasDiff(log) && (
                              <Tooltip title={expandedRows.has(log.id) ? 'Hide changes' : 'Show changes'}>
                                <IconButton size="small">
                                  {expandedRows.has(log.id) ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expanded diff row */}
                        {hasDiff(log) && (
                          <TableRow key={`${log.id}-diff`}>
                            <TableCell colSpan={6} sx={{ p: 0, borderBottom: expandedRows.has(log.id) ? undefined : 'none' }}>
                              <Collapse in={expandedRows.has(log.id)}>
                                <Box sx={{ p: 2, backgroundColor: '#F8F9FA' }}>
                                  <Stack direction="row" spacing={2}>
                                    {log.oldValues && (
                                      <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#B71C1C', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                                          Before
                                        </Typography>
                                        <Box component="pre" sx={{ m: 0, p: 1.5, borderRadius: 1, backgroundColor: '#FFF5F5', border: '1px solid #FFCDD2', fontSize: 11, fontFamily: 'monospace', overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                          {formatJson(log.oldValues)}
                                        </Box>
                                      </Box>
                                    )}
                                    {log.newValues && (
                                      <Box sx={{ flex: 1 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#1B5E20', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
                                          After
                                        </Typography>
                                        <Box component="pre" sx={{ m: 0, p: 1.5, borderRadius: 1, backgroundColor: '#F1F8E9', border: '1px solid #C5E1A5', fontSize: 11, fontFamily: 'monospace', overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                          {formatJson(log.newValues)}
                                        </Box>
                                      </Box>
                                    )}
                                  </Stack>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {result && result.totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">
                    Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, result.total)} of {result.total.toLocaleString()} entries
                  </Typography>
                  <Pagination
                    count={result.totalPages}
                    page={page}
                    onChange={handlePageChange}
                    size="small"
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}