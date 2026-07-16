import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfileChatSession from "@/components/dashboard/ProfileChatSession";
import { auth } from "@/lib/auth";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-settings";

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
  const adminSettings = await getAdminSettingsSnapshot();

  if (!adminSettings.isChatFeatureEnabled) {
    redirect("/dashboard");
  }

  return <ProfileChatSession profileId={profileId} />;
}
