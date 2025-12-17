import { useState, useRef } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Upload, X, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
    value?: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    maxSizeMB?: number;
    className?: string;
}

export function ImageUpload({
    value,
    onChange,
    label = 'Kép',
    placeholder = 'https://example.com/image.jpg',
    maxSizeMB = 15,
    className = '',
}: ImageUploadProps) {
    const [mode, setMode] = useState<'upload' | 'url'>('upload');
    const [isDragging, setIsDragging] = useState(false);
    const [urlInput, setUrlInput] = useState(value && !value.startsWith('data:') ? value : '');
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (file: File) => {
        setError('');

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Csak képfájlok engedélyezettek');
            return;
        }

        // Validate file size
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > maxSizeMB) {
            setError(`A kép túl nagy (max ${maxSizeMB}MB)`);
            return;
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            onChange(result);
        };
        reader.onerror = () => {
            setError('Hiba történt a kép beolvasásakor');
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
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
            setError('');
        }
    };

    const handleClear = () => {
        onChange('');
        setUrlInput('');
        setError('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    {label}
                </label>
            )}

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-3">
                <button
                    type="button"
                    onClick={() => setMode('upload')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'upload'
                        ? 'bg-primary text-white'
                        : 'bg-[#0f1015] text-gray-400 hover:text-white border border-white/10'
                        }`}
                >
                    <Upload size={16} className="inline mr-2" />
                    Feltöltés
                </button>
                <button
                    type="button"
                    onClick={() => setMode('url')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'url'
                        ? 'bg-primary text-white'
                        : 'bg-[#0f1015] text-gray-400 hover:text-white border border-white/10'
                        }`}
                >
                    <LinkIcon size={16} className="inline mr-2" />
                    URL
                </button>
            </div>

            {/* Upload Mode */}
            {mode === 'upload' && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                        ? 'border-primary bg-primary/10'
                        : 'border-white/20 hover:border-primary/50 bg-[#0f1015]'
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
            {mode === 'url' && (
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onBlur={handleUrlSubmit}
                        onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                        placeholder={placeholder}
                        className="flex-1 px-4 py-3 bg-[#0f1015] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>
            )}

            {/* Error Message */}
            {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
            )}

            {/* Preview */}
            {value && (
                <div className="mt-4 relative">
                    <div className="relative w-full aspect-video bg-[#0f1015] rounded-xl overflow-hidden border border-white/10">
                        <img
                            src={value}
                            alt="Preview"
                            className="w-full h-full object-contain"
                        />
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black rounded-lg transition-colors"
                        >
                            <X size={16} className="text-white" />
                        </button>
                    </div>
                    {value.startsWith('data:') && (
                        <p className="text-xs text-gray-500 mt-2">
                            Méret: {(value.length * 0.75 / 1024).toFixed(2)} KB
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
