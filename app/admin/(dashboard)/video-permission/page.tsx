import VideoPermissionClient from "./VideoPermissionClient";

export const metadata = {
  title: "Video Permission | Admin",
};

export default function VideoPermissionPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
          Video Verification Approvals
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Review user selfie videos to improve profile authenticity and safety.
        </p>
      </div>
      <VideoPermissionClient />
    </div>
  );
}
