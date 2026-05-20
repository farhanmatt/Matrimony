import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/profile/ProfileForm";

export const metadata: Metadata = { title: "Create Profile" };

export default async function CreateProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existing = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (existing) redirect("/dashboard/profile/edit");

  return (
    <div>
      <h1 className="mb-2 text-[1.7rem] font-display font-bold text-gray-900">
        Create Your Profile
      </h1>
      <ProfileForm />
    </div>
  );
}
