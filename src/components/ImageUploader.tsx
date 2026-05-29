import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, ShieldAlert } from 'lucide-react';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export default function ImageUploader({ images, onChange, maxImages = 5 }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const validFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    
    if (images.length + validFiles.length > maxImages) {
      alert(`You can select at most ${maxImages} images total.`);
      return;
    }

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onChange([...images, reader.result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeImage = (index: number) => {
    const filtered = images.filter((_, idx) => idx !== index);
    onChange(filtered);
  };

  const triggerSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col space-y-3" id="image-uploader-wrapper">
      <label className="text-sm font-semibold text-slate-700">Product Images ({images.length}/{maxImages})</label>
      
      {/* Upload Drag & Drop Area */}
      {images.length < maxImages && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={triggerSelect}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
          }`}
          id="dropzone-area"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input-field"
          />
          <UploadCloud className="w-10 h-10 text-indigo-500 mb-2" />
          <p className="text-sm font-medium text-slate-600">
            Drag & drop files here, or <span className="text-indigo-600 font-semibold underline">click to browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">PNG, JPG, JPEG or WEBP (Max {maxImages} files)</p>
        </div>
      )}

      {/* Previews Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3" id="preview-grid-box">
          {images.map((img, idx) => (
            <div key={idx} className="relative group border border-slate-100 rounded-xl overflow-hidden aspect-square shadow-sm bg-slate-100" id={`img-preview-card-${idx}`}>
              <img
                src={img}
                alt="Upload thumbnail"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                id={`preview-img-${idx}`}
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(idx);
                  }}
                  className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer"
                  title="Remove image"
                  id={`remove-img-btn-${idx}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
