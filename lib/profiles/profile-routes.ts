import type { Language } from "@/lib/i18n/locales";

export function getHomePath(language: Language) {
  return `/${language}`;
}

export function getNewProfilePath(language: Language) {
  return `/${language}/profiles/new`;
}

export function getProfilePath(language: Language, profileId: string) {
  return `${getHomePath(language)}/profiles/${encodeURIComponent(profileId)}`;
}

export function getProfileWorkoutCreationPath(
  language: Language,
  profileId: string,
) {
  return `${getProfilePath(language, profileId)}/workouts/new`;
}

export function getProfileWorkoutPath(
  language: Language,
  profileId: string,
  workoutId: string,
) {
  return `${getProfilePath(language, profileId)}/workouts/${encodeURIComponent(workoutId)}`;
}
