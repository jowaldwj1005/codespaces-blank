import { useState, useEffect } from 'react';
import { getContext } from '@microsoft/power-apps/app';
import { systemusers } from '../services/dataverse';

interface CurrentUser {
  systemuserid: string;
  fullname: string;
  businessunitid: string;
}

/**
 * Resolves the current logged-in user via Power Apps SDK context.
 *
 * 1. Calls getContext() → IContext.user.objectId (Azure AD Object ID)
 * 2. Filters systemusers by azureactivedirectoryobjectid to get Dataverse record
 * 3. Falls back to top=1 if context is unavailable (local dev / testing)
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Step 1: Try Power Apps SDK context for the real logged-in user
        let objectId: string | undefined;
        try {
          const ctx = await getContext();
          objectId = ctx?.user?.objectId;
        } catch {
          // getContext() unavailable (e.g. local dev) — fall through to fallback
        }

        // Step 2: Query systemusers — filter by Azure AD objectId if available
        const options: Parameters<typeof systemusers.getAll>[0] = {
          select: ['systemuserid', 'fullname', '_businessunitid_value'],
        };

        if (objectId) {
          options.filter = `azureactivedirectoryobjectid eq '${objectId}'`;
          options.top = 1;
        } else {
          // Fallback: top=1 (dev/testing only — may not be the real user)
          options.top = 1;
        }

        const result = await systemusers.getAll(options);

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
