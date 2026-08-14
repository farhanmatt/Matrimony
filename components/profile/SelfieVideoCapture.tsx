"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Video, X, Loader2, CheckCircle2, ShieldCheck, Trash2, Play, Square, Smartphone, Mail } from "lucide-react";
import { toast } from "sonner";

interface SelfieVideoCaptureProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  error?: string;
  status?: string | null;
}

export default function SelfieVideoCapture({ value, onChange, error, status }: SelfieVideoCaptureProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mobileLinkSent, setMobileLinkSent] = useState(false);
  const [showDemoVideo, setShowDemoVideo] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mobileLinkSent && !value) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/profile/selfies/mobile-sync-video");
          if (res.ok) {
            const data = await res.json();
            if (data.videoUrl) {
              onChange(data.videoUrl);
              setMobileLinkSent(false); // Stop polling after successful sync
            }
          }
        } catch (e) {
          console.error("Failed to sync mobile video", e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [mobileLinkSent, value, onChange]);

  const startCamera = async () => {
    stopCamera();
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
      setRecordedBlob(null);
      setPreviewUrl(null);
    } catch (err: any) {
      toast.error("Could not access camera or microphone. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      const srcObj = videoRef.current.srcObject as MediaStream | null;
      if (srcObj) {
        srcObj.getTracks().forEach(track => {
          track.stop();
        });
      }
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
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
      setRecordedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      
      if (mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => {
          track.stop();
        });
      }
      stopCamera();
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

  const cancelRecording = () => {
    setRecordedBlob(null);
    setPreviewUrl(null);
    startCamera();
  };

  const uploadVideo = async () => {
    if (!recordedBlob) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", recordedBlob, "selfie-video.webm");
      // Cloudinary resource_type must be auto or video
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default");
      formData.append("resource_type", "video");

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Missing Cloudinary config");

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.secure_url) throw new Error("Upload failed");

      toast.success("Selfie video uploaded securely!");
      onChange(uploadData.secure_url);
      setPreviewUrl(null);
      setRecordedBlob(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const removeVideo = () => {
    onChange(null);
  };

  const sendMobileLink = async () => {
    try {
      toast.loading("Generating secure link...");
      const res = await fetch("/api/profile/selfies/mobile-link", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "video_capture" })
      });
      if (res.ok) {
        toast.dismiss();
        const data = await res.json();
        toast.success("Link sent to your registered Gmail!");
        setMobileLinkSent(true);
        if (data.debugLink) {
          console.log("Mobile Video Verification Link (Debug):", data.debugLink);
        }
      } else {
        throw new Error("Failed to send link");
      }
    } catch (e) {
      toast.dismiss();
      toast.error("Failed to send mobile verification link");
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-500" /> Video Verification (Optional)
          </h3>
          <p className="text-sm text-gray-500">Record a short 10-second video to boost your profile trust.</p>
        </div>
        
        {!value && !cameraActive && !previewUrl && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Video className="w-4 h-4" /> Record Video
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

      {mobileLinkSent && !value && !cameraActive && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <Mail className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900">Check your email</h4>
            <p className="text-sm text-blue-700 mt-1">We've sent a secure link to your Gmail. Open it on your phone to record your video. This page will automatically update once you've uploaded it.</p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-blue-400 ml-auto shrink-0" />
        </div>
      )}

      {cameraActive && !previewUrl && (
        <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl relative animate-in fade-in slide-in-from-bottom-4">
          <button
            type="button"
            onClick={stopCamera}
            disabled={recording}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors disabled:opacity-0"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative aspect-video w-full max-w-2xl mx-auto flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 pointer-events-none border-[3px] border-white/20 rounded-2xl m-4"></div>
            
            {recording && (
              <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-500/90 text-white px-4 py-2 rounded-full font-bold text-sm animate-pulse shadow-lg backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
                <span>REC</span>
                <span className="font-mono tabular-nums ml-1">00:{timeLeft.toString().padStart(2, '0')}</span>
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-900 flex justify-center">
            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 hover:scale-105 active:scale-95 transition-all"
              >
                <div className="w-4 h-4 rounded-full bg-white"></div>
                Start Recording
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-2 px-8 py-3 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all"
              >
                <Square className="w-5 h-5 fill-current" />
                Stop Recording
              </button>
            )}
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl relative animate-in fade-in slide-in-from-bottom-4">
          <div className="relative aspect-video w-full max-w-2xl mx-auto flex items-center justify-center bg-black">
            <video
              src={previewUrl}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
            
            {uploading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-medium">Uploading securely...</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-900 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              disabled={uploading}
              onClick={cancelRecording}
              className="flex w-full sm:w-auto justify-center items-center gap-2 px-8 py-3 bg-gray-800 text-white font-bold rounded-full hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              Retake
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={uploadVideo}
              className="flex w-full sm:w-auto justify-center items-center gap-2 px-8 py-3 bg-indigo-500 text-white font-bold rounded-full hover:bg-indigo-600 transition-all disabled:opacity-50"
            >
              <Video className="w-5 h-5" />
              Upload Video
            </button>
          </div>
        </div>
      )}

      {value && !previewUrl && (
        <div className="relative group rounded-xl overflow-hidden aspect-video max-w-md border border-gray-200 shadow-sm bg-gray-100">
          <video src={value} controls className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-2 pointer-events-none">
            <div className="pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to remove this video?")) {
                    removeVideo();
                  }
                }}
                className="p-2 bg-white/90 text-rose-600 rounded-full hover:bg-white hover:scale-110 transition-all shadow-sm backdrop-blur-sm"
                title="Remove Video"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-2 z-10">
            {status ? (
              <div className={`px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-sm backdrop-blur-sm ${status === 'APPROVED' ? 'bg-emerald-500/90 text-white' : status === 'REJECTED' ? 'bg-rose-500/90 text-white' : 'bg-amber-500/90 text-white'}`}>
                {status === 'APPROVED' ? <CheckCircle2 className="w-3 h-3" /> : status === 'REJECTED' ? <X className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                {status === 'APPROVED' ? 'Approved' : status === 'REJECTED' ? 'Rejected' : 'Pending Approval'}
              </div>
            ) : (
              <div className="bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3" /> Submitted
              </div>
            )}
          </div>
        </div>
      )}
      
      {value && !previewUrl && status === 'REJECTED' && (
        <div className="mt-4">
          <button
            type="button"
            onClick={startCamera}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <Video className="w-4 h-4" /> Record Replacement Video
          </button>
        </div>
      )}

      {/* Demo Section */}
      <div className="pt-6 mt-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">For Video Demo:</span>
          <button
            type="button"
            onClick={() => setShowDemoVideo(!showDemoVideo)}
            className="px-4 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-sm font-medium rounded-md hover:bg-indigo-100 transition-colors shadow-sm"
          >
            {showDemoVideo ? "Close Demo" : "Click Here"}
          </button>
        </div>
        
        {showDemoVideo && (
          <div className="mt-6 bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
            <video 
              src="/video.mp4" 
              controls 
              playsInline
              autoPlay
              className="w-full h-auto max-h-[75vh] object-contain mx-auto" 
            />
          </div>
        )}
      </div>
    </div>
  );
}
