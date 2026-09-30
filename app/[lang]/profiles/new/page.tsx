import Link from "next/link";

import { CreateProfileForm } from "@/components/profiles/create-profile-form";
import { getTranslations } from "@/lib/i18n/server";
import { getHomePath } from "@/lib/profiles/profile-routes";

export default async function NewProfilePage() {
  const t = await getTranslations();

  return (
    <div>
      <header className="mb-8">
        <Link href={getHomePath(t.language)} className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-zinc-500 outline-none hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-primary">
          {t.messages.common.back_to_profiles}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
          {t.messages.common.create_profile}
        </h1>
        <p className="mt-2 text-base text-zinc-500">
          {t.messages.profile_form.heading_description}
        </p>
      </header>
      <CreateProfileForm />
    </div>
  );
}
