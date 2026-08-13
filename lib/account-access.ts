import type { UserProfile } from '@/lib/types';

export function getAccountRestriction(
  profile: UserProfile | null
): {
  blocked: boolean;
  permanent: boolean;
  message: string;
  until: number | null;
} {
  if (!profile?.banned) {
    return {
      blocked: false,
      permanent: false,
      message: '',
      until: null,
    };
  }

  if (
    profile.bannedUntil &&
    Number(profile.bannedUntil) <= Date.now()
  ) {
    return {
      blocked: false,
      permanent: false,
      message: '',
      until: null,
    };
  }

  if (profile.bannedUntil) {
    return {
      blocked: true,
      permanent: false,
      until: Number(profile.bannedUntil),
      message:
        profile.banReason ||
        'Your account is temporarily restricted.',
    };
  }

  return {
    blocked: true,
    permanent: true,
    until: null,
    message:
      profile.banReason ||
      'Your account has been permanently restricted.',
  };
}
