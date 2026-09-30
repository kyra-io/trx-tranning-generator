import { connection } from "next/server";

import { ProfileSelector } from "@/components/profiles/profile-selector";
import { getTranslations } from "@/lib/i18n/server";
import { listProfiles } from "@/lib/profiles/profile.repository";

export default async function HomePage() {
  await connection();
  const [profiles, t] = await Promise.all([listProfiles(), getTranslations()]);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          {t.messages.home.heading}
        </h1>
        <p className="mt-2 text-base text-zinc-500">
          {t.messages.home.subheading}
        </p>
      </header>
      <ProfileSelector profiles={profiles} />
    </div>
  );
}
