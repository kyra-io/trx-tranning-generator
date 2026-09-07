import {
  insertProfile,
  type Profile,
} from '@/lib/profiles/profile.repository';

export const PROFILE_NAME_MAX_LENGTH = 100;

export type ValidationDetail = {
  path: string[];
  message: string;
};

export class ProfileValidationError extends Error {
  constructor(public readonly details: ValidationDetail[]) {
    super('Invalid profile');
    this.name = 'ProfileValidationError';
  }
}

export class ProfileNameConflictError extends Error {
  constructor() {
    super('A profile with this name already exists');
    this.name = 'ProfileNameConflictError';
  }
}

export function validateProfileInput(input: unknown):
  | { success: true; name: string }
  | { success: false; details: ValidationDetail[] } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      success: false,
      details: [{ path: [], message: 'Expected a JSON object' }],
    };
  }

  const name = (input as Record<string, unknown>).name;

  if (typeof name !== 'string') {
    return {
      success: false,
      details: [{ path: ['name'], message: 'Expected a string' }],
    };
  }

  const normalizedName = name.trim();

  if (normalizedName.length === 0) {
    return {
      success: false,
      details: [{ path: ['name'], message: 'Profile name is required' }],
    };
  }

  if (normalizedName.length > PROFILE_NAME_MAX_LENGTH) {
    return {
      success: false,
      details: [{
        path: ['name'],
        message: `Profile name must be at most ${PROFILE_NAME_MAX_LENGTH} characters`,
      }],
    };
  }

  return { success: true, name: normalizedName };
}

export function isProfileNameConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && error.code === '23505') return true;
  return 'cause' in error && isProfileNameConflict(error.cause);
}

export async function createProfile(input: unknown): Promise<Profile> {
  const validation = validateProfileInput(input);

  if (!validation.success) {
    throw new ProfileValidationError(validation.details);
  }

  try {
    return await insertProfile(validation.name);
  } catch (error) {
    if (isProfileNameConflict(error)) {
      throw new ProfileNameConflictError();
    }

    throw error;
  }
}
