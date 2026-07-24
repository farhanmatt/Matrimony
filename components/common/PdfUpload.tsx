"use client";

import { CldUploadWidget } from "next-cloudinary";
import { FileText, FileUp, X, Download } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  getCloudinaryUploadResultInfo,
} from "@/lib/utils/image";

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
  const pendingUploadUrlRef = useRef<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const activeError = uploadError ?? error;

  const restorePageScroll = useCallback(() => {
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
  }, []);

  const resetPendingUpload = useCallback(() => {
    pendingUploadUrlRef.current = null;
  }, []);

  const handleUpload = useCallback(
    (result: unknown) => {
      const { secureUrl, bytes } = getCloudinaryUploadResultInfo(result);

      if (secureUrl && bytes && bytes > maxFileSizeBytes) {
        pendingUploadUrlRef.current = null;
        setUploadError(sizeErrorMessage);
        return;
      }

      setUploadError(null);
      pendingUploadUrlRef.current = secureUrl;
    },
    [maxFileSizeBytes, sizeErrorMessage]
  );

  const handleClose = useCallback(() => {
    if (pendingUploadUrlRef.current) {
      onChange(pendingUploadUrlRef.current);
    }
    resetPendingUpload();
    restorePageScroll();
  }, [onChange, resetPendingUpload, restorePageScroll]);

  const handleCancel = useCallback(() => {
    resetPendingUpload();
    restorePageScroll();
  }, [resetPendingUpload, restorePageScroll]);

  const handleError = useCallback((nextError: unknown) => {
    resetPendingUpload();
    // Assuming simple error object extraction for this example
    const msg = typeof nextError === "object" && nextError !== null && "message" in nextError
        ? (nextError as { message: string }).message
        : "Upload failed.";
    setUploadError(msg);
    restorePageScroll();
  }, [resetPendingUpload, restorePageScroll]);

  const handleOpen = useCallback(() => {
    resetPendingUpload();
    setUploadError(null);
  }, [resetPendingUpload]);

  return (
    <div className="space-y-4 w-full">
      <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {activeError ? <p className="mt-1 text-xs text-rose-500">{activeError}</p> : null}
      </div>
      <div className="flex items-center gap-4">
        <CldUploadWidget
          onOpen={handleOpen}
          onSuccess={handleUpload}
          onClose={handleClose}
          onAbort={handleCancel}
          onBatchCancelled={handleCancel}
          onError={handleError}
          uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default"}
          options={{
            maxFiles: 1,
            maxFileSize: maxFileSizeBytes,
            multiple: false,
            resourceType: "raw", // Needed for PDF files
            clientAllowedFormats: ["pdf"],
            showCompletedButton: true,
            singleUploadAutoClose: false,
          }}
        >
          {({ open }) => {
            if (value) {
              return (
                <div className="relative w-64 h-32 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center group shadow-sm transition-all hover:border-gray-300">
                  <div className="flex flex-col items-center justify-center text-gray-600 gap-2">
                    <FileText className="w-8 h-8 text-rose-500" />
                    <span className="text-xs font-medium">Medical_Report.pdf</span>
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-rose-600 hover:underline flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()} // Ensure CldUploadWidget doesn't catch it
                    >
                      <Download className="w-3 h-3" /> View / Download
                    </a>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); // Avoid triggering open() from widget if any wrapper intercepts
                      setUploadError(null);
                      onRemove();
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    type="button"
                    title="Remove PDF"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            }

            return (
              <button
                type="button"
                onClick={() => open()}
                className="w-64 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-rose-500 hover:bg-rose-50/50 transition-all text-gray-500 hover:text-rose-600"
              >
                <div className="p-3 bg-gray-50 rounded-full group-hover:bg-rose-100 transition-colors">
                  <FileUp className="w-6 h-6" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-medium">Upload PDF Report</span>
                  <span className="text-xs text-gray-400">Max size 4MB</span>
                </div>
              </button>
            );
          }}
        </CldUploadWidget>
      </div>
    </div>
  );
}
