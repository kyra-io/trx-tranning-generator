import { connection } from "next/server";

import { ProfileSelector } from "@/components/profiles/profile-selector";
import { listProfiles } from "@/lib/profiles/profile.repository";

export default async function HomePage() {
  await connection();
  const profiles = await listProfiles();

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Choose profile
        </h1>
        <p className="mt-2 text-base text-zinc-500">
          Open your personal workout history
        </p>
      </header>
      <ProfileSelector profiles={profiles} />
    </div>
  );
}
