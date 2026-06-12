"use client";

import { CldUploadWidget } from "next-cloudinary";
import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import {
  DEFAULT_IMAGE_UPLOAD_MAX_BYTES,
  DEFAULT_IMAGE_UPLOAD_SIZE_ERROR_MESSAGE,
  getCloudinaryUploadResultInfo,
  getImageUploadErrorMessage,
  isImageUploadWithinSizeLimit,
} from "@/lib/utils/image";

interface ImageUploadProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  onRemove: () => void;
  label: string;
  error?: string;
  maxFileSizeBytes?: number;
  sizeErrorMessage?: string;
}

export default function ImageUpload({
  value,
  onChange,
  onRemove,
  label,
  error,
  maxFileSizeBytes = DEFAULT_IMAGE_UPLOAD_MAX_BYTES,
  sizeErrorMessage = DEFAULT_IMAGE_UPLOAD_SIZE_ERROR_MESSAGE,
}: ImageUploadProps) {
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

      if (secureUrl && !isImageUploadWithinSizeLimit(bytes, maxFileSizeBytes)) {
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
    setUploadError(getImageUploadErrorMessage(nextError, sizeErrorMessage));
    restorePageScroll();
  }, [resetPendingUpload, restorePageScroll, sizeErrorMessage]);

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
            maxImageFileSize: maxFileSizeBytes,
            multiple: false,
            resourceType: "image",
            clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
            showCompletedButton: true,
            singleUploadAutoClose: false,
          }}
        >
          {({ open }) => {
            if (value) {
              return (
                <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-gray-200 group">
                  <Image
                    fill
                    src={value}
                    alt="Upload"
                    className="object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setUploadError(null);
                      onRemove();
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    type="button"
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
                className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-rose-500 hover:bg-rose-50/50 transition-all text-gray-500 hover:text-rose-600"
              >
                <div className="p-3 bg-gray-50 rounded-full group-hover:bg-rose-100 transition-colors">
                  <ImagePlus className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium">Upload Image</span>
              </button>
            );
          }}
        </CldUploadWidget>
      </div>
    </div>
  );
}
