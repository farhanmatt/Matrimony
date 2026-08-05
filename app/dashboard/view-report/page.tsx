"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, ArrowLeft, Download } from "lucide-react";
import { getPdfPageUrl } from "@/lib/utils/image";

export default function ViewReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");

  const [pages, setPages] = useState<number[]>([1]);
  const [hasMore, setHasMore] = useState(true);

  if (!url) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-slate-400">No report URL provided.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-slate-900/80 p-4 backdrop-blur-md border-b border-slate-800">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>
        <h1 className="text-lg font-semibold text-white">Medical Report</h1>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Original File</span>
        </a>
      </div>

      {/* Pages Container */}
      <div className="mx-auto max-w-4xl p-4 sm:p-8 pb-24 flex flex-col gap-8">
        {pages.map((pageNum) => (
          <PdfPage 
            key={pageNum}
            url={getPdfPageUrl(url, pageNum)}
            pageNum={pageNum}
            onLoadSuccess={() => {
              if (hasMore && pageNum === pages.length) {
                setPages(prev => [...prev, pageNum + 1]);
              }
            }}
            onLoadError={() => {
              setHasMore(false);
              setPages(prev => prev.filter(p => p !== pageNum));
            }}
          />
        ))}
        {pages.length === 0 && !hasMore && (
           <div className="text-center text-slate-400 py-12 bg-slate-800 rounded-xl">
             <p>Failed to load the medical report.</p>
             <p className="text-sm mt-2">The file may not be a valid PDF or is restricted.</p>
             {url && url.includes("/raw/") && (
               <p className="text-sm mt-4 text-rose-400 font-medium">This report was uploaded in an older unsupported format. Please ask the user to re-upload it to view it properly.</p>
             )}
           </div>
        )}
      </div>
    </div>
  );
}

function PdfPage({ url, pageNum, onLoadSuccess, onLoadError }: { url: string; pageNum: number; onLoadSuccess: () => void; onLoadError: () => void; }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [currentUrl, setCurrentUrl] = useState(url);

  return (
    <div className="relative flex min-h-[400px] w-full flex-col items-center justify-center overflow-hidden rounded-xl bg-white shadow-2xl">
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 gap-3">
           <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
           <p className="text-sm font-medium text-slate-500">Loading page {pageNum}...</p>
        </div>
      )}
      
      {status !== "error" && (
        <img
          src={currentUrl}
          alt={`Page ${pageNum}`}
          className={`w-full h-auto object-contain transition-opacity duration-500 ${status === "loaded" ? "opacity-100" : "opacity-0"}`}
          onLoad={() => {
            setStatus("loaded");
            onLoadSuccess();
          }}
          onError={() => {
            if (currentUrl.includes("pg_") && pageNum === 1) {
              setCurrentUrl(currentUrl.replace(/pg_\d+,/, ""));
            } else {
              setStatus("error");
              onLoadError();
            }
          }}
        />
      )}
    </div>
  );
}
