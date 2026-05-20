"use client";

import { CldUploadWidget } from "next-cloudinary";
import { ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useRef } from "react";

interface ImageUploadProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  onRemove: () => void;
  label: string;
}

export default function ImageUpload({
  value,
  onChange,
  onRemove,
  label,
}: ImageUploadProps) {
  const pendingUploadUrlRef = useRef<string | null>(null);

  const restorePageScroll = useCallback(() => {
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
  }, []);

  const resetPendingUpload = useCallback(() => {
    pendingUploadUrlRef.current = null;
  }, []);

  const handleUpload = useCallback(
    (result: any) => {
      const secureUrl =
        typeof result?.info === "object" &&
        result.info &&
        typeof result.info.secure_url === "string"
          ? result.info.secure_url
          : null;

      pendingUploadUrlRef.current = secureUrl;
    },
    []
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

  const handleError = useCallback(() => {
    resetPendingUpload();
    restorePageScroll();
  }, [resetPendingUpload, restorePageScroll]);

  const handleOpen = useCallback(() => {
    resetPendingUpload();
  }, [resetPendingUpload]);

  return (
    <div className="space-y-4 w-full">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
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
