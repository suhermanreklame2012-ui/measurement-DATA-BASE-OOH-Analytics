import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  X, 
  ExternalLink, 
  Camera, 
  AlertTriangle,
  FolderOpen,
  HardDrive
} from 'lucide-react';
import { formatImageUrl, getPhotoSourceLabel, isGoogleDriveUrl } from '../utils/imageUtils';

interface ConstructionPhotoCarouselProps {
  photos?: string[];
  spotTitle: string;
  spotCategory?: string;
  spotSize?: string;
  onOpenEdit?: () => void;
}

export const ConstructionPhotoCarousel: React.FC<ConstructionPhotoCarouselProps> = ({
  photos = [],
  spotTitle,
  spotCategory,
  spotSize,
  onOpenEdit
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadErrors, setLoadErrors] = useState<Record<number, boolean>>({});

  // Filter out empty strings
  const validPhotos = photos.filter(p => p && p.trim().length > 0);

  if (validPhotos.length === 0) {
    return (
      <div className="w-full p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-200/70 text-slate-500 mx-auto flex items-center justify-center">
          <Camera className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Dokumentasi Foto Konstruksi Belum Tersedia</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
            Belum ada dokumentasi foto lapangan atau tiang konstruksi untuk titik ini. Anda dapat mengunggah file foto atau memasukkan tautan Google Drive melalui formulir edit titik.
          </p>
        </div>
        {onOpenEdit && (
          <button
            onClick={onOpenEdit}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 font-semibold text-xs rounded-lg transition-colors shadow-2xs"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            + Tambah Foto Konstruksi / Link Google Drive
          </button>
        )}
      </div>
    );
  }

  const activePhotoRaw = validPhotos[currentIndex] || validPhotos[0];
  const activePhotoFormatted = formatImageUrl(activePhotoRaw);
  const sourceInfo = getPhotoSourceLabel(activePhotoRaw);
  const hasError = loadErrors[currentIndex];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? validPhotos.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev === validPhotos.length - 1 ? 0 : prev + 1));
  };

  const handleImageError = (index: number) => {
    setLoadErrors(prev => ({ ...prev, [index]: true }));
  };

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-600" />
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Dokumentasi Lapangan & Konstruksi ({validPhotos.length} Foto)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            Foto {currentIndex + 1} dari {validPhotos.length}
          </span>
          {onOpenEdit && (
            <button
              onClick={onOpenEdit}
              className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Kelola Foto
            </button>
          )}
        </div>
      </div>

      {/* Main Carousel Display */}
      <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md group select-none">
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-300 bg-slate-900/95">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="font-bold text-xs text-white">Pratinjau Gambar Tidak Dapat Dimuat</p>
            <p className="text-[11px] text-slate-400 max-w-sm mt-1">
              {sourceInfo.isDrive
                ? "Pastikan izin berbagi file di Google Drive disetel ke 'Siapa saja yang memiliki link' (Anyone with the link)."
                : "Tautan gambar mungkin kadaluwarsa atau diblokir oleh kebijakan CORS browser."}
            </p>
            <a
              href={activePhotoRaw}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka Tautan Asli di Tab Baru
            </a>
          </div>
        ) : (
          <img
            src={activePhotoFormatted}
            alt={`${spotTitle} - Foto Konstruksi ${currentIndex + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            onError={() => handleImageError(currentIndex)}
            referrerPolicy="no-referrer"
          />
        )}

        {/* Gradient overlays for readability */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <span className="px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-semibold border border-white/10 flex items-center gap-1">
              {sourceInfo.isDrive && <HardDrive className="w-3 h-3 text-sky-400" />}
              {sourceInfo.label}
            </span>
            {spotSize && (
              <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-slate-300 text-[10px] font-medium border border-white/10">
                {spotSize}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 transition-colors"
              title="Perbesar Layar Penuh"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <a
              href={activePhotoRaw}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 transition-colors"
              title="Buka URL asli di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Bottom Metadata Info */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-10 pointer-events-none">
          <div className="text-white max-w-[70%]">
            <div className="text-xs font-bold truncate drop-shadow-md">{spotTitle}</div>
            <div className="text-[10px] text-slate-300 drop-shadow-md">
              Dokumentasi Foto Konstruksi #{currentIndex + 1}
            </div>
          </div>

          {/* Dots Indicator */}
          {validPhotos.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-900/70 backdrop-blur-xs px-2 py-1 rounded-full border border-white/10 pointer-events-auto">
              {validPhotos.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex ? 'w-4 bg-emerald-400' : 'w-1.5 bg-slate-400/60 hover:bg-slate-200'
                  }`}
                  title={`Ke Foto #${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {validPhotos.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white border border-white/15 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 shadow-md z-10"
              title="Foto Sebelumnya"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white border border-white/15 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 shadow-md z-10"
              title="Foto Berikutnya"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Row */}
      {validPhotos.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {validPhotos.map((photo, idx) => {
            const formatted = formatImageUrl(photo);
            const isSelected = idx === currentIndex;
            const itemError = loadErrors[idx];
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  isSelected 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105 shadow-sm' 
                    : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'
                }`}
              >
                {itemError ? (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                    #{idx + 1}
                  </div>
                ) : (
                  <img
                    src={formatted}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(idx)}
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="absolute bottom-0.5 right-0.5 bg-slate-900/80 text-white text-[8px] px-1 rounded font-mono font-bold">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsFullscreen(false)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            {/* Top Lightbox Bar */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <div>
                <h3 className="font-bold text-sm sm:text-base">{spotTitle}</h3>
                <p className="text-xs text-slate-400">
                  Dokumentasi Foto Konstruksi #{currentIndex + 1} dari {validPhotos.length}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={activePhotoRaw}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka Tautan Asli
                </a>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                  title="Tutup (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Container */}
            <div className="relative w-full h-[65vh] sm:h-[75vh] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
              {hasError ? (
                <div className="p-6 text-center text-slate-300">
                  <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                  <p className="font-bold text-sm text-white">Gambar Tidak Dapat Ditampilkan</p>
                  <p className="text-xs text-slate-400 max-w-md mt-1">
                    Silakan buka tautan secara langsung di tab baru.
                  </p>
                </div>
              ) : (
                <img
                  src={activePhotoFormatted}
                  alt={`${spotTitle} - Layar Penuh`}
                  className="w-full h-full object-contain"
                  onError={() => handleImageError(currentIndex)}
                  referrerPolicy="no-referrer"
                />
              )}

              {/* Navigation Arrows in Lightbox */}
              {validPhotos.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 flex items-center justify-center transition-all shadow-xl"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white border border-white/20 flex items-center justify-center transition-all shadow-xl"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom dots in Lightbox */}
            {validPhotos.length > 1 && (
              <div className="flex items-center gap-1.5 mt-3">
                {validPhotos.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentIndex ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-600 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
