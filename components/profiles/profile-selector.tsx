"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale, useTranslations } from "@/lib/i18n/translations-provider";
import { getNewProfilePath, getProfilePath } from "@/lib/profiles/profile-routes";

type SelectableProfile = { id: string; name: string };

export function ProfileSelector({ profiles }: { profiles: SelectableProfile[] }) {
  const router = useRouter();
  const language = useLocale();

  return (
    <ProfileSelectorView
      profiles={profiles}
      onOpen={(profileId) => router.push(getProfilePath(language, profileId))}
    />
  );
}

export function ProfileSelectorView({
  profiles,
  onOpen,
}: {
  profiles: SelectableProfile[];
  onOpen: (profileId: string) => void;
}) {
  const t = useTranslations();
  const language = useLocale();
  const [profileId, setProfileId] = useState("");
  const newProfilePath = getNewProfilePath(language);

  if (profiles.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center">
        <h2 className="font-semibold text-zinc-900">
          {t.messages.profile_selector.empty_title}
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-500">
          {t.messages.profile_selector.empty_description}
        </p>
        <Link
          href={newProfilePath}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary-hover px-5 text-sm font-semibold text-white outline-none hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t.messages.common.create_profile}
        </Link>
      </div>
    );
  }

  const hasValidSelection = profiles.some(({ id }) => id === profileId);

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="profile"
          className="mb-2 block text-sm font-semibold text-zinc-900"
        >
          {t.messages.common.profile}
        </label>
        <select
          id="profile"
          value={profileId}
          onChange={(event) => setProfileId(event.target.value)}
          className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <option value="">{t.messages.profile_selector.select_placeholder}</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>{profile.name}</option>
          ))}
        </select>
      </div>
      <button
        type="button"
        disabled={!hasValidSelection}
        onClick={() => {
          if (hasValidSelection) onOpen(profileId);
        }}
        className="min-h-12 w-full rounded-xl bg-primary-hover px-5 text-base font-semibold text-white outline-none hover:bg-primary-strong focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t.messages.profile_selector.open}
      </button>
      <Link
        href={newProfilePath}
        className="flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-800 outline-none hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {t.messages.common.create_profile}
      </Link>
    </div>
  );
}
