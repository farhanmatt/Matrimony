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
      <h1
        className="ui-enter-up mb-2 text-[1.7rem] font-display font-bold text-gray-900"
        style={{ animationDelay: "40ms", animationFillMode: "forwards" }}
      >
        Create / Update Your Profile
      </h1>
      <p
        className="ui-enter-up mb-8 text-[14px] text-gray-500"
        style={{ animationDelay: "110ms", animationFillMode: "forwards" }}
      >
        Let&apos;s get to know you better! Please complete all the sections to
        increase your chances of finding the perfect match.
      </p>
      <div
        className="ui-enter-scale"
        style={{ animationDelay: "180ms", animationFillMode: "forwards" }}
      >
        <ProfileForm />
      </div>
    </div>
  );
}
