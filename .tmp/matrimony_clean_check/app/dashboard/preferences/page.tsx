import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, PlusCircle, SlidersHorizontal, Sparkles } from "lucide-react";
import PreferenceForm from "@/components/dashboard/PreferenceForm";
import { auth } from "@/lib/auth";
import { normalizeMotherTongue } from "@/lib/constants/languages";
import { prisma } from "@/lib/prisma";
import type { PreferenceInput } from "@/lib/validations/profile";

export const metadata: Metadata = { title: "Partner Preferences" };

export default async function PreferencesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      fullName: true,
      preference: true,
    },
  });

  if (!profile) {
    return (
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Partner Preferences
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Create your profile first, then add the details you prefer in a life
          partner.
        </p>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <Heart className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-display font-bold text-gray-900 mb-2">
                Complete your profile to continue
              </h2>
              <p className="text-sm text-gray-600 leading-6">
                Preferences are connected to your matrimony profile, so we need
                your profile details before saving partner preferences.
              </p>
              <Link
                href="/dashboard/profile/create"
                className="btn-primary mt-5 inline-flex items-center gap-2 py-2.5 px-6 text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Create Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const defaultValues: Partial<PreferenceInput> = profile.preference
    ? {
        ageMin: profile.preference.ageMin,
        ageMax: profile.preference.ageMax,
        heightMin: profile.preference.heightMin,
        heightMax: profile.preference.heightMax,
        religion: profile.preference.religion,
        caste: profile.preference.caste,
        education: profile.preference.education,
        profession: profile.preference.profession,
        location: profile.preference.location,
        maritalStatus: profile.preference.maritalStatus,
        language: normalizeMotherTongue(profile.preference.language),
      }
    : {};

  return (
    <div>
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 border border-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Matchmaking Preferences
        </div>
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
          Partner Preferences
        </h1>
        <p className="text-gray-500 text-sm max-w-2xl">
          Tell us what kind of partner you are looking for. These details help
          keep your discovery experience focused and relevant.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <PreferenceForm defaultValues={defaultValues} />
        </div>

        <aside className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-5">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <h2 className="font-display text-xl font-bold mb-2">
            Stay flexible
          </h2>
          <p className="text-sm text-rose-50 leading-6">
            Broader preferences usually surface more profiles. You can update
            these details anytime as your search evolves.
          </p>
        </aside>
      </div>
    </div>
  );
}
