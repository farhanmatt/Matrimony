"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Video, Square, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function MobileVideoCapture() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [cameraActive, setCameraActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: any) {
      setError("Could not access camera or microphone. Please check permissions.");
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    startCamera();
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [token, stopCamera]);

  const uploadVideo = async (blob: Blob) => {
    if (!token) return;
    
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", blob, "mobile-video.webm");
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default");
      formData.append("resource_type", "video");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Missing Cloudinary config");

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.secure_url) throw new Error("Upload to Cloudinary failed");

      const saveRes = await fetch("/api/verify-selfie/upload-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, secureUrl: uploadData.secure_url }),
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        throw new Error(errorData.error || "Failed to save video to profile");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to upload video");
      // Allow them to try recording again if it failed
      startCamera();
    } finally {
      setUploading(false);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm"
    });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      stopCamera();
      uploadVideo(blob);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setRecording(true);
    setTimeLeft(10);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  };

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
          Your video has been securely uploaded and synced to your desktop profile.
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
      
      {!success && !uploading && cameraActive && (
        <div className="bg-gray-900 rounded-xl overflow-hidden relative aspect-[3/4] flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {recording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500/90 text-white px-3 py-1.5 rounded-full font-bold text-xs animate-pulse">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              REC 00:{timeLeft.toString().padStart(2, '0')}
            </div>
          )}

          <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full border-4 border-red-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              >
                <div className="w-8 h-8 bg-red-500 rounded-full"></div>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
              >
                <Square className="w-6 h-6 fill-white text-white" />
              </button>
            )}
          </div>
        </div>
      )}

      {uploading && (
        <div className="bg-gray-900 rounded-xl overflow-hidden relative aspect-[3/4] flex flex-col items-center justify-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mb-4" />
          <p className="font-medium">Uploading video securely...</p>
        </div>
      )}
      
      {!uploading && !success && (
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-xs text-gray-500">Record a short 10-second video of yourself speaking naturally.</p>
        </div>
      )}
    </div>
  );
}
