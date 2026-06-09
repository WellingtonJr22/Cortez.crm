import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UNASSIGNED = '__none__';

/**
 * Select that loads the real list of active attendants from the backend.
 *
 * - Admins can pick any active attendant (or leave the lead unassigned).
 * - Attendants can only assign to themselves, so the control is locked.
 *
 * `value` is the assigned_to_user_id. `onChange(user | null)` receives the full
 * attendant object (so the caller can store the denormalised name/email) or null
 * when cleared. The backend re-validates this regardless of what the UI sends.
 */
export default function AttendantSelect({ value, onChange }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: attendants = [] } = useQuery({
    queryKey: ['attendants'],
    queryFn: () => base44.entities.User.listAttendants(),
  });

  // Non-admins may only be assigned to themselves.
  const options = isAdmin ? attendants : attendants.filter((a) => a.id === user?.id);

  const handleChange = (val) => {
    if (val === UNASSIGNED) return onChange(null);
    const picked = attendants.find((a) => a.id === val) || null;
    onChange(picked);
  };

  return (
    <Select value={value || UNASSIGNED} onValueChange={handleChange} disabled={!isAdmin}>
      <SelectTrigger className="bg-secondary border-border h-9 text-sm">
        <SelectValue placeholder="Selecione um atendente..." />
      </SelectTrigger>
      <SelectContent>
        {isAdmin && <SelectItem value={UNASSIGNED}>Sem responsável</SelectItem>}
        {options.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.full_name || a.email}
          </SelectItem>
        ))}
        {options.length === 0 && (
          <SelectItem value={UNASSIGNED} disabled>
            Nenhum atendente ativo
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
