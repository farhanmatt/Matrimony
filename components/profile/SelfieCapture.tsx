"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { Camera, Smartphone, Trash2, X, Loader2, CheckCircle2, ShieldCheck, Mail } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface SelfieCaptureProps {
  value: string[];
  onChange: (urls: string[]) => void;
  error?: string;
}

export default function SelfieCapture({ value = [], onChange, error }: SelfieCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mobileLinkSent, setMobileLinkSent] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);

  // Poll for updates if mobile link was sent
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mobileLinkSent && value.length < 4) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/profile/selfies/mobile-sync");
          if (res.ok) {
            const data = await res.json();
            if (data.selfies && data.selfies.length > 0) {
              onChange([...value, ...data.selfies].slice(0, 4));
            }
          }
        } catch (e) {
          console.error("Failed to sync mobile selfies", e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [mobileLinkSent, value, onChange]);

  const capture = useCallback(async () => {
    if (value.length >= 4) {
      toast.error("Maximum of 4 selfie photos allowed. Please delete one first.");
      return;
    }

    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    setUploading(true);
    try {
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
      
      if (!uploadData.secure_url) throw new Error("Upload failed");

      toast.success("Selfie uploaded securely!");
      onChange([...value, uploadData.secure_url]);
      setCameraActive(false);

    } catch (err: any) {
      toast.error(err.message || "Failed to capture selfie");
    } finally {
      setUploading(false);
    }
  }, [webcamRef, value, onChange]);

  const removeSelfie = (urlToRemove: string) => {
    onChange(value.filter(url => url !== urlToRemove));
  };

  const sendMobileLink = async () => {
    try {
      toast.loading("Generating secure link...");
      const res = await fetch("/api/profile/selfies/mobile-link", { method: "POST" });
      if (res.ok) {
        toast.dismiss();
        const data = await res.json();
        toast.success("Link sent to your registered Gmail!");
        setMobileLinkSent(true);
        if (data.debugLink) {
          console.log("Mobile Verification Link (Debug):", data.debugLink);
        }
      } else {
        throw new Error("Failed to send link");
      }
    } catch (e) {
      toast.dismiss();
      toast.error("Failed to send mobile verification link");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" /> Live Verification
          </h3>
          <p className="text-sm text-gray-500">Capture up to 4 real-time selfies for profile verification.</p>
        </div>
        
        {value.length < 4 && !cameraActive && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCameraActive(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 font-medium rounded-lg hover:bg-rose-100 transition-colors"
            >
              <Camera className="w-4 h-4" /> Add Selfie Photo
            </button>
            <button
              type="button"
              onClick={sendMobileLink}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Smartphone className="w-4 h-4" /> Use Mobile Phone
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {mobileLinkSent && value.length < 4 && !cameraActive && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Check your email</h4>
            <p className="text-sm text-blue-700 mt-1">We've sent a secure link to your Gmail. Open it on your phone to capture your selfies. This page will automatically update once you've captured them.</p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-blue-400 ml-auto shrink-0" />
        </div>
      )}

      {cameraActive && (
        <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl relative animate-in fade-in slide-in-from-bottom-4">
          <button
            type="button"
            onClick={() => setCameraActive(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative aspect-video w-full max-w-2xl mx-auto flex items-center justify-center bg-black">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "user" }}
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 pointer-events-none border-[3px] border-white/20 rounded-2xl m-4"></div>
            
            {uploading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-medium">Uploading securely...</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-900 flex justify-center">
            <button
              type="button"
              disabled={uploading}
              onClick={capture}
              className="flex items-center gap-2 px-8 py-3 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              Capture & Save
            </button>
          </div>
        </div>
      )}

      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {value.map((url, index) => (
            <div key={url} className="relative group rounded-xl overflow-hidden aspect-[3/4] border border-gray-200 shadow-sm bg-gray-100">
              <Image src={url} alt={`Selfie ${index + 1}`} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to remove this selfie?")) {
                      removeSelfie(url);
                    }
                  }}
                  className="p-2 bg-white/90 text-rose-600 rounded-full hover:bg-white hover:scale-110 transition-all shadow-sm backdrop-blur-sm"
                  title="Remove Selfie"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-2 left-2 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </div>
            </div>
          ))}
          
          {value.length >= 4 && (
            <div className="col-span-full mt-2 p-3 bg-amber-50 text-amber-700 text-sm font-medium rounded-xl border border-amber-200 flex items-center justify-center text-center">
              Maximum of 4 selfie photos allowed. To add another, please delete one first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
