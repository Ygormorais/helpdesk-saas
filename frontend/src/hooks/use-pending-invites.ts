import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { invitesApi, type InviteDto } from '@/api/invites';

type Options = {
  enabled?: boolean;
  debounceMs?: number;
};

export function usePendingInvites(email: string | undefined | null, options: Options = {}) {
  const enabled = options.enabled ?? true;
  const debounceMs = options.debounceMs ?? 400;

  const normalizedEmail = useMemo(() => String(email || '').trim().toLowerCase(), [email]);
  const [pendingInvites, setPendingInvites] = useState<InviteDto[]>([]);
  const [pendingInvitesLoading, setPendingInvitesLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setPendingInvites([]);
      setPendingInvitesLoading(false);
      return;
    }

    const isValid = z.string().email().safeParse(normalizedEmail).success;
    if (!isValid) {
      setPendingInvites([]);
      setPendingInvitesLoading(false);
      return;
    }

    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        setPendingInvitesLoading(true);
        const res = await invitesApi.pending(normalizedEmail);
        if (cancelled) return;
        setPendingInvites(res.data.invites || []);
      } catch {
        if (cancelled) return;
        setPendingInvites([]);
      } finally {
        if (!cancelled) setPendingInvitesLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [debounceMs, enabled, normalizedEmail]);

  return { pendingInvites, pendingInvitesLoading, normalizedEmail };
}
