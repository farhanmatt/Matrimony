"use client";

import { FileText, FileUp, X, Download, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { getPdfCloudinaryUrl } from "@/lib/utils/image";

interface PdfUploadProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  onRemove: () => void;
  label: string;
  error?: string;
  maxFileSizeBytes?: number;
  sizeErrorMessage?: string;
}

const DEFAULT_PDF_MAX_BYTES = 4 * 1024 * 1024; // 4MB
const DEFAULT_PDF_SIZE_ERROR = "File size must be less than 4MB.";

export default function PdfUpload({
  value,
  onChange,
  onRemove,
  label,
  error,
  maxFileSizeBytes = DEFAULT_PDF_MAX_BYTES,
  sizeErrorMessage = DEFAULT_PDF_SIZE_ERROR,
}: PdfUploadProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const activeError = uploadError ?? error;

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }

    if (file.size > maxFileSizeBytes) {
      setUploadError(sizeErrorMessage);
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload PDF");
      }

      const data = await response.json();
      if (data.url) {
        onChange(data.url);
      } else {
        throw new Error("No URL returned from server");
      }
    } catch (err: any) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setIsUploading(false);
      // Reset input value so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [maxFileSizeBytes, sizeErrorMessage, onChange]);

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4 w-full">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
        {activeError ? <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{activeError}</p> : null}
      </div>
      <div className="flex items-center gap-4">
        {value ? (
          <div className="relative w-64 h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-center group shadow-sm transition-all hover:border-gray-300 dark:hover:border-slate-600">
            <div className="flex flex-col items-center justify-center text-gray-600 dark:text-slate-400 gap-2">
              <FileText className="w-8 h-8 text-rose-500 dark:text-rose-400" />
              <span className="text-xs font-medium dark:text-slate-300">Medical_Report.pdf</span>
              <a
                href={getPdfCloudinaryUrl(value)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 z-10"
                onClick={(e) => e.stopPropagation()} 
              >
                <Download className="w-3 h-3" /> View / Download
              </a>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); 
                setUploadError(null);
                onRemove();
              }}
              className="absolute top-2 right-2 p-1.5 bg-rose-500 dark:bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
              type="button"
              title="Remove PDF"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />
            <button
              type="button"
              onClick={handleTriggerUpload}
              disabled={isUploading}
              className="w-64 h-32 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-rose-500 dark:hover:border-rose-500 hover:bg-rose-50/50 dark:hover:bg-slate-800 transition-all text-gray-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-full group-hover:bg-rose-100 dark:group-hover:bg-slate-700 transition-colors">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                ) : (
                  <FileUp className="w-6 h-6" />
                )}
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium">
                  {isUploading ? "Uploading..." : "Upload PDF Report"}
                </span>
                {!isUploading && (
                  <span className="text-xs text-gray-400 dark:text-slate-500">Max size 4MB</span>
                )}
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
