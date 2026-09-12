import { Autocomplete, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { appUsersApi } from '../../api/auth/userManagementApi';
import { useUser } from '../../context/UserContext';

interface PersonAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  plantCode: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export default function PersonAutocomplete({ label, value, onChange, plantCode, disabled, size = 'small' }: PersonAutocompleteProps) {
  const { profile } = useUser();
  const currentUserName = profile?.fullName;
  const [plantUserNames, setPlantUserNames] = useState<string[]>([]);

  useEffect(() => {
    if (!plantCode) { setPlantUserNames([]); return; }
    appUsersApi.getAll({ activeOnly: true, plantCode })
      .then((res) => setPlantUserNames(res.data.map((u) => u.fullName)))
      .catch(() => setPlantUserNames([]));
  }, [plantCode]);

  useEffect(() => {
    if ((!value || value === '') && currentUserName) {
      onChange(currentUserName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserName]);

  return (
    <Autocomplete
      freeSolo
      options={plantUserNames}
      value={value}
      disabled={disabled}
      onInputChange={(_, newValue) => onChange(newValue)}
      renderInput={(params) => (
        <TextField {...params} label={label} size={size} fullWidth />
      )}
    />
  );
}
