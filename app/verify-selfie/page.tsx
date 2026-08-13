import { Suspense } from "react";
import MobileSelfieCapture from "./MobileSelfieCapture";
import MobileVideoCapture from "./MobileVideoCapture";
import { Loader2 } from "lucide-react";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export default function VerifySelfiePage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;
  let purpose = "selfie_capture";

  if (token) {
    try {
      const decoded = jwt.decode(token) as { purpose?: string } | null;
      if (decoded && decoded.purpose) {
        purpose = decoded.purpose;
      }
    } catch (e) {
      // invalid token will be handled by the client components
    }
  }

  const isVideo = purpose === "video_capture";

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-6 bg-gray-900 text-center">
          <h1 className="text-xl font-bold text-white">Identity Verification</h1>
          <p className="text-gray-400 text-sm mt-1">
            {isVideo ? "Record your verification video" : "Capture your selfie photos"}
          </p>
        </div>
        <div className="p-6">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading camera...</p>
              </div>
            }
          >
            {isVideo ? <MobileVideoCapture /> : <MobileSelfieCapture />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
