// Shown instead of the app to someone who has signed in with a VRA account but hasn't been given access yet
// (status Pending) or whose request was turned down (Declined). Pending users can send their details for the admin.
import {
  Alert, Autocomplete, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
  Grid, Stack, TextField, Typography,
} from '@mui/material';
import { HourglassTop, Block, Send, Logout, Refresh, Edit, CheckCircle } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import dayjs from 'dayjs';
import { useUser } from '../../context/UserContext';
import { meApi } from '../../api/auth/meApi';
import type { PlantOption } from '../../types/userManagement';

export default function AccessRequestPage() {
  const { profile, reload } = useUser();
  const { instance } = useMsal();

  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [employeeId, setEmployeeId] = useState(profile?.employeeId ?? '');
  const [designation, setDesignation] = useState(profile?.designation ?? '');
  const [phone, setPhone] = useState(profile?.phoneNumber ?? '');
  const [plantCodes, setPlantCodes] = useState<string[]>(profile?.requestedPlantCodes ?? []);
  const [note, setNote] = useState(profile?.requestNote ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const declined = profile?.status === 'Declined';
  // Details already sent → show a summary until they choose to edit
  const alreadySent = !!(profile?.requestedPlantCodes?.length || profile?.employeeId || profile?.designation || profile?.requestNote);
  const [editing, setEditing] = useState(!alreadySent);

  useEffect(() => {
    if (!declined) meApi.getPlantOptions().then((res) => setPlants(res.data)).catch(() => setPlants([]));
  }, [declined]);

  const plantByCode = useMemo(() => new Map(plants.map((p) => [p.plantCode, p])), [plants]);
  const initials = (profile?.fullName ?? '?').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const signOut = () => instance.logoutRedirect({ postLogoutRedirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI }).catch(() => {});

  const submit = async () => {
    if (plantCodes.length === 0) { setError('Choose at least one plant you work at.'); return; }
    setSaving(true);
    setError(null);
    try {
      await meApi.submitAccessRequest({
        employeeId: employeeId.trim() || undefined,
        designation: designation.trim() || undefined,
        phoneNumber: phone.trim() || undefined,
        requestedPlantCodes: plantCodes,
        note: note.trim() || undefined,
      });
      setEditing(false);
      reload();
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Could not send your request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2,
      background: 'linear-gradient(160deg, #EEF3F8 0%, #F7F9FB 60%, #FFF6E0 100%)',
    }}>
      <Card sx={{ width: '100%', maxWidth: 620, borderRadius: 3, boxShadow: '0 8px 32px rgba(10,61,98,0.10)' }}>
        <Box sx={{ height: 8, background: 'linear-gradient(90deg, #0A3D62, #1E5F8C 60%, #F0A500)' }} />
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            Power Plant Operational Data Logging
          </Typography>

          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 2 }}>
            <Avatar sx={{ width: 52, height: 52, backgroundColor: declined ? 'error.light' : '#F0A500', color: '#1A1A2E', fontWeight: 700 }}>
              {declined ? <Block /> : initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                {declined ? 'Access request declined' : `Welcome, ${profile?.fullName?.split(' ')[0] ?? ''}`}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>{profile?.email}</Typography>
            </Box>
          </Stack>

          {declined ? (
            <Stack spacing={2} sx={{ mt: 3 }}>
              <Alert severity="error" variant="outlined">
                An administrator declined your request for access.
                {profile?.declineReason && <><br /><strong>Reason:</strong> {profile.declineReason}</>}
              </Alert>
              <Typography variant="body2" color="text.secondary">
                If you think this is a mistake, contact your system administrator. They can still approve you later.
              </Typography>
            </Stack>
          ) : (
            <>
              <Alert icon={<HourglassTop />} severity="info" variant="outlined" sx={{ mt: 3 }}>
                Your account is waiting for an administrator to give you a role and plants.
                {profile?.requestedOn && <> Requested {dayjs(profile.requestedOn).format('DD MMM YYYY, HH:mm')}.</>}
              </Alert>

              {editing ? (
                <Box sx={{ mt: 3 }}>
                  <Typography sx={{ fontWeight: 700 }}>Tell the administrator about yourself</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This helps them give you the right access. Only the plants are required.
                  </Typography>
                  {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <Autocomplete
                        multiple disableCloseOnSelect size="small"
                        options={plants.map((p) => p.plantCode)}
                        groupBy={(code) => plantByCode.get(code)?.classificationType || 'Other'}
                        getOptionLabel={(code) => {
                          const p = plantByCode.get(code);
                          return p ? `${p.plantName} (${p.plantCode})` : code;
                        }}
                        value={plantCodes}
                        onChange={(_, v) => setPlantCodes(v)}
                        renderInput={(params) => (
                          <TextField {...params} required label="Plant(s) you work at"
                            placeholder={plantCodes.length ? '' : 'Choose one or more'} />
                        )}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Employee ID" size="small" fullWidth value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)} slotProps={{ htmlInput: { maxLength: 50 } }} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField label="Phone" size="small" fullWidth value={phone}
                        onChange={(e) => setPhone(e.target.value)} slotProps={{ htmlInput: { maxLength: 20 } }} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField label="Designation" size="small" fullWidth value={designation} placeholder="e.g. Shift Engineer"
                        onChange={(e) => setDesignation(e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField label="Note for the administrator" size="small" fullWidth multiline rows={2} value={note}
                        placeholder="Optional, e.g. which logs you'll be entering"
                        onChange={(e) => setNote(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} />
                    </Grid>
                  </Grid>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                    <Button variant="contained" onClick={submit} disabled={saving}
                      startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Send />}>
                      {saving ? 'Sending…' : alreadySent ? 'Update request' : 'Send request'}
                    </Button>
                    {alreadySent && <Button onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>}
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ mt: 3 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                    <CheckCircle color="success" fontSize="small" />
                    <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>Your details were sent</Typography>
                    <Button size="small" startIcon={<Edit />} onClick={() => setEditing(true)}>Edit</Button>
                  </Stack>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Plants</Typography>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', mt: 0.5 }} useFlexGap>
                        {(profile?.requestedPlantCodes ?? []).map((c) => (
                          <Chip key={c} size="small" variant="outlined" label={plantByCode.get(c)?.plantName ? `${plantByCode.get(c)!.plantName} (${c})` : c} />
                        ))}
                      </Stack>
                    </Box>
                    {[['Employee ID', profile?.employeeId], ['Designation', profile?.designation], ['Phone', profile?.phoneNumber], ['Note', profile?.requestNote]]
                      .filter(([, v]) => !!v)
                      .map(([label, v]) => (
                        <Box key={label}>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                          <Typography variant="body2">{v}</Typography>
                        </Box>
                      ))}
                  </Stack>
                </Box>
              )}
            </>
          )}

          <Divider sx={{ my: 3 }} />
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }} useFlexGap>
            {!declined && (
              <Button variant="outlined" startIcon={<Refresh />} onClick={reload}>Check again</Button>
            )}
            <Button color="inherit" startIcon={<Logout />} onClick={signOut} sx={{ ml: 'auto' }}>Sign out</Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
