import Link from "next/link";

import { CreateProfileForm } from "@/components/profiles/create-profile-form";

export default function NewProfilePage() {
  return (
    <div>
      <header className="mb-8">
        <Link href="/" className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-zinc-500 outline-none hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-primary">
          Back to profiles
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
          Create profile
        </h1>
        <p className="mt-2 text-base text-zinc-500">Give your workout history a name</p>
      </header>
      <CreateProfileForm />
    </div>
  );
}
