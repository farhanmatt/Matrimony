"use client";

import { CldUploadWidget } from "next-cloudinary";
import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_IMAGE_UPLOAD_MAX_BYTES,
  DEFAULT_IMAGE_UPLOAD_SIZE_ERROR_MESSAGE,
  getCloudinaryUploadResultInfo,
  getImageUploadErrorMessage,
  isImageUploadWithinSizeLimit,
} from "@/lib/utils/image";

interface MultiImageUploadProps {
  values: string[];
  onChange: (values: string[]) => void;
  label: string;
  helperText?: string;
  error?: string;
  maxFiles?: number;
  maxFileSizeBytes?: number;
  sizeErrorMessage?: string;
}

export default function MultiImageUpload({
  values,
  onChange,
  label,
  helperText,
  error,
  maxFiles = 4,
  maxFileSizeBytes = DEFAULT_IMAGE_UPLOAD_MAX_BYTES,
  sizeErrorMessage = DEFAULT_IMAGE_UPLOAD_SIZE_ERROR_MESSAGE,
}: MultiImageUploadProps) {
  const pendingUploadUrlRef = useRef<string | null>(null);
  const valuesRef = useRef(values);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const activeError = uploadError ?? error;

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const restorePageScroll = useCallback(() => {
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
  }, []);

  const resetPendingUpload = useCallback(() => {
    pendingUploadUrlRef.current = null;
  }, []);

  const handleUpload = useCallback((result: unknown) => {
    const { secureUrl, bytes } = getCloudinaryUploadResultInfo(result);

    if (secureUrl && !isImageUploadWithinSizeLimit(bytes, maxFileSizeBytes)) {
      pendingUploadUrlRef.current = null;
      setUploadError(sizeErrorMessage);
      return;
    }

    setUploadError(null);
    pendingUploadUrlRef.current = secureUrl;
  }, [maxFileSizeBytes, sizeErrorMessage]);

  const handleClose = useCallback(() => {
    const currentValues = valuesRef.current;

    if (
      pendingUploadUrlRef.current &&
      !currentValues.includes(pendingUploadUrlRef.current) &&
      currentValues.length < maxFiles
    ) {
      setUploadError(null);
      onChange([...currentValues, pendingUploadUrlRef.current]);
    }

    resetPendingUpload();
    restorePageScroll();
  }, [maxFiles, onChange, resetPendingUpload, restorePageScroll]);

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

  const handleRemove = (indexToRemove: number) => {
    setUploadError(null);
    onChange(values.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-4 w-full">
      <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {helperText ? (
          <p className="mt-1 text-xs leading-5 text-gray-500">{helperText}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4">
        {values.map((value, index) => (
          <div
            key={`${value}-${index}`}
            className="group relative h-32 w-32 overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            <Image
              fill
              src={value}
              alt={`Uploaded photo ${index + 1}`}
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute right-2 top-2 rounded-full bg-rose-500 p-1.5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
              aria-label={`Remove photo ${index + 1}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {values.length < maxFiles ? (
          <CldUploadWidget
            onOpen={handleOpen}
            onSuccess={handleUpload}
            onClose={handleClose}
            onAbort={handleCancel}
            onBatchCancelled={handleCancel}
            onError={handleError}
            uploadPreset={
              process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default"
            }
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
            {({ open }) => (
              <button
                type="button"
                onClick={() => open()}
                className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 transition-all hover:border-rose-500 hover:bg-rose-50/50 hover:text-rose-600"
              >
                <div className="rounded-full bg-gray-50 p-3 transition-colors">
                  <ImagePlus className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium">Add Photo</span>
              </button>
            )}
          </CldUploadWidget>
        ) : null}
      </div>

      {activeError ? <p className="text-xs text-rose-500">{activeError}</p> : null}
    </div>
  );
}

