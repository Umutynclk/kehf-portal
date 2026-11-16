"use client";

import { useCallback, useState, useRef } from "react";

interface ImageUploaderProps {
  currentUrl?: string;
  onUpload: (file: File) => Promise<string>;
  label?: string;
}

export default function ImageUploader({
  currentUrl,
  onUpload,
  label = "Görsel Yükle",
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string>(currentUrl || "");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setPreview(URL.createObjectURL(file));
      setUploading(true);
      try {
        const url = await onUpload(file);
        setPreview(url);
      } catch (err) {
        console.error("Upload failed:", err);
        setPreview(currentUrl || "");
      } finally {
        setUploading(false);
      }
    },
    [onUpload, currentUrl]
  );

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">
        {label}
      </label>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden ${
          dragOver
            ? "border-purple-500 bg-purple-500/10"
            : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
        } ${preview ? "aspect-video" : "py-10"}`}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/30">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <span className="text-sm">
              {uploading ? "Yükleniyor…" : "Sürükle veya tıkla"}
            </span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}
