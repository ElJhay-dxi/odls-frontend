// A user's profile opened from Admin → Users (eye icon). Same layout as "My Profile", worded for someone else.
// Needs View Users — the server checks it too.
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProfileView } from '../profile/ProfilePage';
import { appUsersApi } from '../../api/auth/userManagementApi';
import type { CurrentUserProfile } from '../../types/userManagement';

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    appUsersApi.getProfile(id)
      .then((res) => { setProfile(res.data); setError(null); })
      .catch((err) => setError((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Could not load this profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  const back = (
    <Button variant="outlined" size="small" startIcon={<ArrowBack />} onClick={() => navigate('/admin/users')}
      sx={{ alignSelf: 'center' }}>
      Back to users
    </Button>
  );

  if (loading) return <Box sx={{ textAlign: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error || !profile) return (
    <Box>
      <Alert severity="error" sx={{ mb: 2 }}>{error ?? 'Could not load this profile.'}</Alert>
      {back}
    </Box>
  );

  return (
    <ProfileView profile={profile} isAdmin={profile.isAdmin}
      title={profile.fullName} subtitle="Their account, role, plants and what they can do in the app"
      breadcrumbs={[{ label: 'Admin' }, { label: 'Users', path: '/admin/users' }, { label: profile.fullName }]}
      headerAction={back} />
  );
}
