import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfileChatSession from "@/components/dashboard/ProfileChatSession";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Profile Chat",
};

type PageParams = Promise<{ profileId: string }>;

export default async function ProfileChatPage({
  params,
}: {
  params: PageParams;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { profileId } = await params;

  return <ProfileChatSession profileId={profileId} />;
}
