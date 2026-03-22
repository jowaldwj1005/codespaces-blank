import { useState, useEffect } from 'react';
import { systemusers } from '../services/dataverse';

interface CurrentUser {
  systemuserid: string;
  fullname: string;
  businessunitid: string;
}

/**
 * Fetches the current user's ID, name, and business unit on mount.
 * Uses systemusers.getAll with top=1 — in Power Apps context this
 * typically returns the current user first, or at minimum gives us
 * valid defaults for the create-team form.
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await systemusers.getAll({
          top: 1,
          select: ['systemuserid', 'fullname', '_businessunitid_value'],
        });
        if (!cancelled && result.data && Array.isArray(result.data) && result.data.length > 0) {
          const user = result.data[0] as unknown as Record<string, unknown>;
          setCurrentUser({
            systemuserid: String(user.systemuserid ?? ''),
            fullname: String(user.fullname ?? ''),
            businessunitid: String(user._businessunitid_value ?? ''),
          });
        }
      } catch {
        // non-critical — form just won't have defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { currentUser, loading };
}
