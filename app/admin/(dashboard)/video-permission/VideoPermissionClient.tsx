"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  Check, 
  X, 
  Video, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  Phone 
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";

type SelfieVideoStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ProfileVideo {
  id: string;
  profileUserId: string;
  fullName: string;
  profileImage: string | null;
  selfieVideoUrl: string;
  selfieVideoStatus: SelfieVideoStatus;
  createdAt: string;
  phone: string | null;
  user: {
    email: string | null;
  };
}

export default function VideoPermissionClient() {
  const [profiles, setProfiles] = useState<ProfileVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SelfieVideoStatus | "ALL">("PENDING");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  
  const activeProfile = selectedProfileId ? profiles.find(p => p.id === selectedProfileId) : null;

  useEffect(() => {
    fetchProfiles();
  }, [filter]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/admin/video-permission", window.location.origin);
      url.searchParams.set("status", filter);
      const res = await fetch(url.toString(), { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch profiles");
      const data = await res.json();
      setProfiles(data);
    } catch (error) {
      toast.error("Failed to load video permissions");
    } finally {
      setLoading(false);
    }
  };

  const updateVideoStatus = async (profileId: string, status: "APPROVED" | "REJECTED") => {
    setProcessingId(profileId);
    try {
      const res = await fetch("/api/admin/video-permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, status })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      
      toast.success(data.message);
      
      // Update local state instead of refetching to be fast
      setProfiles(prev => 
        filter === "ALL" 
          ? prev.map(p => p.id === profileId ? { ...p, selfieVideoStatus: status } : p)
          : prev.filter(p => p.id !== profileId)
      );
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusIcon = (status: SelfieVideoStatus) => {
    switch (status) {
      case "APPROVED": return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "REJECTED": return <XCircle className="h-4 w-4 text-rose-500" />;
      case "PENDING": return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: SelfieVideoStatus) => {
    switch (status) {
      case "APPROVED": 
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">{getStatusIcon(status)} Approved</span>;
      case "REJECTED": 
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/10">{getStatusIcon(status)} Rejected</span>;
      case "PENDING": 
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">{getStatusIcon(status)} Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex gap-2 bg-slate-100/50 p-1 rounded-xl">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-lg transition-all",
                filter === status 
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" 
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              )}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 border-dashed bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
            <Video className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No videos found</h3>
          <p className="mt-1 text-sm text-slate-500">
            There are no videos with the status &quot;{filter}&quot; at the moment.
          </p>
        </div>
      ) : (
        <div className="flex flex-col space-y-4">
          {profiles.map((profile) => (
            <div 
              key={profile.id} 
              className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all gap-4"
            >
              <div className="flex items-center gap-4">
                {profile.profileImage ? (
                  <img src={profile.profileImage} alt={profile.fullName} className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-slate-400" />
                  </div>
                )}
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {profile.fullName}
                    {getStatusBadge(profile.selfieVideoStatus)}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {profile.user.email && (
                      <p className="text-sm text-slate-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />
                        {profile.user.email}
                      </p>
                    )}
                    {profile.phone && (
                      <p className="text-sm text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {profile.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedProfileId(profile.id)}
                className="px-5 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-sm rounded-xl transition-colors whitespace-nowrap"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {activeProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Review Video</h3>
              <button 
                onClick={() => setSelectedProfileId(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-5 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    {activeProfile.fullName}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {activeProfile.profileUserId}
                    </span>
                  </h4>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Uploaded: {format(new Date(activeProfile.createdAt), "PPP")}
                  </p>
                  
                  <div className="mt-4 space-y-2">
                    {activeProfile.user.email && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        {activeProfile.user.email}
                      </p>
                    )}
                    {activeProfile.phone && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        {activeProfile.phone}
                      </p>
                    )}
                  </div>
                </div>
                {activeProfile.profileImage ? (
                  <img src={activeProfile.profileImage} alt={activeProfile.fullName} className="w-16 h-16 rounded-full object-cover ring-4 ring-slate-50" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center ring-4 ring-slate-50">
                    <User className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-semibold text-slate-900">Selfie Video Preview</h5>
                  {getStatusBadge(activeProfile.selfieVideoStatus)}
                </div>
                <div className="aspect-video w-full bg-black rounded-xl overflow-hidden relative shadow-inner">
                  <video 
                    src={activeProfile.selfieVideoUrl} 
                    controls 
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              {activeProfile.selfieVideoStatus === "PENDING" ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    disabled={processingId === activeProfile.id}
                    onClick={async () => {
                      await updateVideoStatus(activeProfile.id, "REJECTED");
                    }}
                    className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                  <button
                    type="button"
                    disabled={processingId === activeProfile.id}
                    onClick={async () => {
                      await updateVideoStatus(activeProfile.id, "APPROVED");
                    }}
                    className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <span className="text-sm text-slate-500 font-medium whitespace-nowrap">Change status:</span>
                  <select
                    disabled={processingId === activeProfile.id}
                    value={activeProfile.selfieVideoStatus}
                    onChange={(e) => updateVideoStatus(activeProfile.id, e.target.value as "APPROVED" | "REJECTED")}
                    className="flex-1 text-sm border-slate-200 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
