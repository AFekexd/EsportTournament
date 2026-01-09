import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { ChangeEvent, DragEvent } from "react";
import { Upload, X, Link as LinkIcon, Image as ImageIcon, ZoomIn, ZoomOut, Check, RotateCcw } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import getCroppedImg from "../../utils/cropImage";

interface ImageUploadProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  maxSizeMB?: number;
  className?: string;
  aspect?: "video" | "square";
}

export function ImageUpload({
  value,
  onChange,
  label = "Kép",
  placeholder = "https://example.com/image.jpg",
  maxSizeMB = 15,
  className = "",
  aspect = "video",
}: ImageUploadProps) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState(
    value && !value.startsWith("data:") ? value : ""
  );
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropping State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleFileSelect = async (file: File) => {
    setError("");

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Csak képfájlok engedélyezettek");
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`A kép túl nagy (max ${maxSizeMB}MB)`);
      return;
    }

    // Convert to base64 for cropping
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Instead of calling onChange, set it as imageToCrop
      setImageToCrop(result);
      setZoom(1);
      setRotation(0);
    };
    reader.onerror = () => {
      setError("Hiba történt a kép beolvasásakor");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input so same file can be selected again if cancelled
    e.target.value = "";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setError("");
    }
  };

  const handleClear = () => {
    onChange("");
    setUrlInput("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Crop Handlers
  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(
        imageToCrop,
        croppedAreaPixels,
        rotation
      );
      onChange(croppedImage);
      setImageToCrop(null); // Close modal
    } catch (e) {
      console.error(e);
      setError("Hiba a kép vágása közben");
    }
  };

  const handleCropCancel = () => {
    setImageToCrop(null);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* Cropping Modal Overlay */}
      {imageToCrop && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1a1b26] rounded-2xl w-[90vw] max-w-7xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[95vh] ">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0f1015]">
              <h3 className="font-bold text-white">Kép szerkesztése</h3>
              <button
                onClick={handleCropCancel}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                title="Mégse"
              >
                <X size={20} className="text-gray-400 hover:text-white" />
              </button>
            </div>

            <div className="relative h-[75vh] bg-[#0f1015] w-full">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect === "square" ? 1 : 16 / 9}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
              />
            </div>

            <div className="p-6 bg-[#1a1b26] space-y-4">
              <div className="flex gap-4 items-center">
                <ZoomOut size={16} className="text-gray-400" />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <ZoomIn size={16} className="text-gray-400" />
              </div>

              <div className="flex gap-4 items-center">
                <RotateCcw size={16} className="text-gray-400" />
                <input
                  type="range"
                  value={rotation}
                  min={0}
                  max={360}
                  step={1}
                  aria-labelledby="Rotation"
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-xs text-gray-400 w-8">{rotation}°</span>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={handleCropCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  Mégse
                </button>
                <button
                  onClick={handleCropSave}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                >
                  <Check size={16} />
                  Kép mentése
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {!value ? (
        <>
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "upload"
                ? "bg-primary text-white"
                : "bg-[#0f1015] text-gray-400 hover:text-white border border-white/10"
                }`}
            >
              <Upload size={16} className="inline mr-2" />
              Feltöltés
            </button>
            <button
              type="button"
              onClick={() => setMode("url")}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "url"
                ? "bg-primary text-white"
                : "bg-[#0f1015] text-gray-400 hover:text-white border border-white/10"
                }`}
            >
              <LinkIcon size={16} className="inline mr-2" />
              URL
            </button>
          </div>

          {/* Upload Mode */}
          {mode === "upload" && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                ? "border-primary bg-primary/10"
                : "border-white/20 hover:border-primary/50 bg-[#0f1015]"
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <ImageIcon size={48} className="mx-auto mb-4 text-gray-500" />
              <p className="text-white font-medium mb-1">
                Kattints vagy húzd ide a képet
              </p>
              <p className="text-sm text-gray-400">
                PNG, JPG, GIF, WebP (max {maxSizeMB}MB)
              </p>
            </div>
          )}

          {/* URL Mode */}
          {mode === "url" && (
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onBlur={handleUrlSubmit}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                placeholder={placeholder}
                className="flex-1 px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          )}
          {/* Error Message */}
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </>
      ) : (
        /* Preview */
        <div className="relative">
          <div
            className={`relative w-full ${aspect === "square" ? "aspect-square" : "aspect-video"
              } bg-[#0f1015] rounded-xl overflow-hidden border border-white/10 group`}
          >
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <X size={16} />
                Kép törlése / csere
              </button>
            </div>
          </div>
          {value.startsWith("data:") && (
            <p className="text-xs text-gray-500 mt-2">
              Méret: {((value.length * 0.75) / 1024).toFixed(2)} KB
            </p>
          )}
        </div>
      )}
    </div>
  );
}
