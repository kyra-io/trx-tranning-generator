export function getProfilePath(profileId: string) {
  return `/profiles/${encodeURIComponent(profileId)}`;
}

export function getProfileWorkoutCreationPath(profileId: string) {
  return `${getProfilePath(profileId)}/workouts/new`;
}

export function getProfileWorkoutPath(profileId: string, workoutId: string) {
  return `${getProfilePath(profileId)}/workouts/${encodeURIComponent(workoutId)}`;
}
