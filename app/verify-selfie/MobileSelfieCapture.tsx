"use client";

import React, { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { useSearchParams } from "next/navigation";
import { Camera, CheckCircle2, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import Image from "next/image";

export default function MobileSelfieCapture() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [selfies, setSelfies] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(async () => {
    if (!token) {
      setError("Invalid or missing token.");
      return;
    }
    if (selfies.length >= 4) {
      setError("Maximum of 4 photos allowed.");
      return;
    }

    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    setUploading(true);
    setError(null);
    try {
      // 1. Upload to Cloudinary directly
      const formData = new FormData();
      formData.append("file", imageSrc);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Missing Cloudinary config");

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.secure_url) throw new Error("Upload to Cloudinary failed");

      // 2. Submit to our API with token
      const saveRes = await fetch("/api/verify-selfie/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, secureUrl: uploadData.secure_url }),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        throw new Error(errorData.error || "Failed to save selfie to profile");
      }

      setSelfies((prev) => [...prev, uploadData.secure_url]);
      
      if (selfies.length + 1 >= 4) {
        setSuccess(true);
      }
    } catch (e: any) {
      setError(e.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  }, [webcamRef, selfies, token]);

  if (!token) {
    return (
      <div className="text-center py-8 text-rose-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="font-semibold">Invalid Link</p>
        <p className="text-sm mt-2 text-rose-400">The verification link is missing or malformed.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-8 text-emerald-600">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">All Done!</h2>
        <p className="mt-2 text-gray-500">
          Your selfies have been securely uploaded and synced to your desktop profile.
        </p>
        <p className="mt-4 text-sm text-gray-400">You may close this window.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-gray-900 rounded-xl overflow-hidden relative aspect-[3/4] flex items-center justify-center">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "user" }}
          className="w-full h-full object-cover"
        />
        
        {uploading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="font-medium">Uploading...</p>
          </div>
        )}

        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
          <button
            type="button"
            disabled={uploading || selfies.length >= 4}
            onClick={capture}
            className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            <div className="w-12 h-12 bg-white rounded-full"></div>
          </button>
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-gray-700">
          Captured: <span className="text-rose-600 font-bold">{selfies.length}</span> / 4
        </p>
        <p className="text-xs text-gray-400 mt-1">Please ensure your face is clearly visible.</p>
      </div>
      
      {selfies.length > 0 && (
        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-100">
          {selfies.map((url, i) => (
            <div key={i} className="aspect-square relative rounded-md overflow-hidden border border-gray-200">
              <Image src={url} alt={`Selfie ${i+1}`} fill className="object-cover" />
            </div>
          ))}
        </div>
      )}
      
      {selfies.length > 0 && selfies.length < 4 && (
        <button
          onClick={() => setSuccess(true)}
          className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl shadow hover:bg-emerald-600 transition-colors"
        >
          Finish Upload
        </button>
      )}
    </div>
  );
}
