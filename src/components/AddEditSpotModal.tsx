import React, { useState, useRef } from 'react';
import { 
  X, 
  PlusCircle, 
  MapPin, 
  Building, 
  DollarSign, 
  Layers, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  UploadCloud,
  Link2,
  Plus,
  Trash2,
  Image as ImageIcon,
  HardDrive,
  Star
} from 'lucide-react';
import { MediaSpot, MediaCategory, MediaType, LocationType, TrafficDensity } from '../types/ooh';
import { addNotification } from '../services/storageService';
import { auditSpotWithAI } from '../services/aiSecurityService';
import { formatImageUrl, getPhotoSourceLabel, isGoogleDriveUrl } from '../utils/imageUtils';

interface AddEditSpotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (spot: MediaSpot) => void;
  existingSpot?: MediaSpot | null;
}

export const AddEditSpotModal: React.FC<AddEditSpotModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingSpot
}) => {
  const [name, setName] = useState<string>(existingSpot?.name || '');
  const [city, setCity] = useState<string>(existingSpot?.city || 'Kota Bandung');
  const [district, setDistrict] = useState<string>(existingSpot?.district || '');
  const [category, setCategory] = useState<MediaCategory>(existingSpot?.category || 'OOH_STATIC');
  const [mediaType, setMediaType] = useState<MediaType>(existingSpot?.mediaType || 'Billboard Frontlite');
  const [size, setSize] = useState<string>(existingSpot?.size || '5 m x 10 m');
  const [layout, setLayout] = useState<'Horizontal' | 'Vertical'>(existingSpot?.layout || 'Vertical');
  const [isAvailable, setIsAvailable] = useState<boolean>(existingSpot?.isAvailable ?? true);
  const [price1Mo, setPrice1Mo] = useState<number>(existingSpot?.pricing.oneMonth || 30000000);
  const [locationType, setLocationType] = useState<LocationType>(existingSpot?.locationType || 'Pusat Kota & Protokol');
  const [trafficDensity, setTrafficDensity] = useState<TrafficDensity>(existingSpot?.trafficDensity || 'Padat');
  const [lat, setLat] = useState<number>(existingSpot?.coordinates.lat || -6.9175);
  const [lng, setLng] = useState<number>(existingSpot?.coordinates.lng || 107.6191);
  
  // Store array of construction photo URLs / Drive links
  const [imageUrls, setImageUrls] = useState<string[]>(() => {
    if (existingSpot?.imageUrls && existingSpot.imageUrls.length > 0) {
      return [...existingSpot.imageUrls];
    }
    if (existingSpot?.imageUrl) {
      return [existingSpot.imageUrl];
    }
    return [];
  });
  const [urlInput, setUrlInput] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [aiWarning, setAiWarning] = useState<string | null>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setImageUrls(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setImageUrls(prev => [...prev, trimmed]);
    setUrlInput('');
  };

  const handleRemovePhoto = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    setImageUrls(prev => {
      const target = prev[index];
      const filtered = prev.filter((_, i) => i !== index);
      return [target, ...filtered];
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsVerifying(true);
    setAiWarning(null);

    // Traffic estimation formula
    const trafficBase = 
      trafficDensity === 'Sangat Padat' ? 140000 : 
      trafficDensity === 'Padat' ? 95000 : 
      trafficDensity === 'Sedang' ? 60000 : 30000;
    
    const impressionMultiplier = category === 'DOOH_DIGITAL' ? 2.3 : 1.55;
    const dailyTraffic = trafficBase + Math.floor(Math.random() * 10000);
    const dailyImpressions = Math.round(dailyTraffic * impressionMultiplier);

    const validImageUrls = imageUrls.map(u => u.trim()).filter(u => u.length > 0);

    const rawSpot: Partial<MediaSpot> = {
      id: existingSpot?.id || `NEW-${Date.now().toString().slice(-4)}`,
      no: existingSpot?.no || 999,
      name: name.trim(),
      roadName: name.split('(')[0].split('Dpn')[0].trim(),
      city: city,
      district: district.trim() || 'Pusat Kota',
      category: category,
      mediaType: mediaType,
      size: size.trim(),
      layout: layout,
      availability: isAvailable ? 'Available' : 'Tersewa / Kontrak',
      isAvailable: isAvailable,
      pricing: {
        oneMonth: price1Mo,
        threeMonths: Math.round(price1Mo * 3 * 0.95),
        sixMonths: Math.round(price1Mo * 6 * 0.9),
        oneYear: Math.round(price1Mo * 12 * 0.8)
      },
      locationType: locationType,
      trafficDensity: trafficDensity,
      dailyTraffic: dailyTraffic,
      dailyImpressions: dailyImpressions,
      visibilityScore: category === 'DOOH_DIGITAL' ? 98 : 92,
      coordinates: { lat, lng },
      lighting: category === 'DOOH_DIGITAL' ? 'LED Digital' : mediaType.includes('Backlite') ? 'Backlite' : 'Frontlite',
      updatedAt: new Date().toISOString().split('T')[0],
      imageUrl: validImageUrls[0] || undefined,
      imageUrls: validImageUrls
    };

    // AI Security & Integrity Audit
    try {
      const audit = await auditSpotWithAI(rawSpot);
      if (audit.severity === 'DANGEROUS') {
        setAiWarning(`Ditolak Sistem Keamanan AI: ${audit.issues.join(', ')}`);
        setIsVerifying(false);
        return;
      }

      const finalSpot: MediaSpot = {
        ...rawSpot,
        ...(audit.sanitizedSpot || {}),
        coordinates: { lat, lng }
      } as MediaSpot;

      onSave(finalSpot);

      addNotification({
        title: existingSpot ? 'Data Titik Diperbarui (AI Verified)' : 'Titik Media Baru Ditambahkan (AI Verified)',
        message: `Titik "${finalSpot.name}" di ${finalSpot.city} berhasil diverifikasi AI & disimpan.`,
        type: 'create'
      });

      onClose();
    } catch (err: any) {
      console.warn('AI validation fallback saving:', err);
      onSave(rawSpot as MediaSpot);
      onClose();
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base">
              {existingSpot ? 'Ubah Data Titik Media' : 'Tambah Titik Media OOH / DOOH'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          
          {/* Nama Lokasi */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              Nama Lokasi & Patokan: *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Jl. Riau Depan FO Heritage / Mall BIP"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Wilayah & Kecamatan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Kota / Kabupaten:
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Kota Bandung">Kota Bandung</option>
                <option value="Cimahi">Cimahi</option>
                <option value="Kab. Bandung Barat">Kab. Bandung Barat</option>
                <option value="Kab. Bandung">Kab. Bandung</option>
                <option value="Garut">Garut</option>
                <option value="Sukabumi">Sukabumi</option>
                <option value="Tasikmalaya">Tasikmalaya</option>
                <option value="Kab. Tasikmalaya">Kab. Tasikmalaya</option>
                <option value="Subang">Subang</option>
                <option value="Ciamis">Ciamis</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Kecamatan:
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Contoh: Sukajadi, Coblong"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Kategori & Jenis Media */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Kategori Media:
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as MediaCategory;
                  setCategory(cat);
                  if (cat === 'DOOH_DIGITAL') {
                    setMediaType('LED Videotron');
                  } else {
                    setMediaType('Billboard Frontlite');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="OOH_STATIC">OOH Statis</option>
                <option value="DOOH_DIGITAL">DOOH Videotron (Digital)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Tipe Konstruksi:
              </label>
              <select
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as MediaType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              >
                {category === 'DOOH_DIGITAL' ? (
                  <>
                    <option value="LED Videotron">LED Videotron</option>
                    <option value="LED BANDO">LED BANDO</option>
                    <option value="LED Pylon Berbaris">LED Pylon Berbaris</option>
                    <option value="LED Single Pole">LED Single Pole</option>
                  </>
                ) : (
                  <>
                    <option value="Billboard Frontlite">Billboard Frontlite</option>
                    <option value="Billboard Backlite">Billboard Backlite</option>
                    <option value="Bando Frontlite">Bando Frontlite</option>
                    <option value="JPO Frontlite">JPO Frontlite</option>
                    <option value="JPO Backlite">JPO Backlite</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Ukuran & Orientasi */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Dimensi Ukuran:
              </label>
              <input
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Contoh: 4 m x 8 m atau 5 m x 10 m"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Orientasi Layout:
              </label>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Vertical">Vertical (Tegak)</option>
                <option value="Horizontal">Horizontal (Melebar)</option>
              </select>
            </div>
          </div>

          {/* Jenis Lokasi & Kepadatan Traffic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Karakteristik Lokasi:
              </label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as LocationType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Komersial & Mall">Komersial & Mall</option>
                <option value="Pusat Kota & Protokol">Pusat Kota & Protokol</option>
                <option value="Jalur Tol & Arteri">Jalur Tol & Arteri</option>
                <option value="Pendidikan & Kampus">Pendidikan & Kampus</option>
                <option value="Simpang & Flyover">Simpang & Flyover</option>
                <option value="Transport Hub & Stasiun">Transport Hub & Stasiun</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Kepadatan Traffic:
              </label>
              <select
                value={trafficDensity}
                onChange={(e) => setTrafficDensity(e.target.value as TrafficDensity)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Sangat Padat">Sangat Padat (&gt;120k/hari)</option>
                <option value="Padat">Padat (80k - 120k/hari)</option>
                <option value="Sedang">Sedang (40k - 80k/hari)</option>
                <option value="Lancar">Lancar (&lt;40k/hari)</option>
              </select>
            </div>
          </div>

          {/* Tarif 1 Bulan & Ketersediaan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Tarif 1 Bulan / Sisi (IDR):
              </label>
              <input
                type="number"
                step="1000000"
                value={price1Mo}
                onChange={(e) => setPrice1Mo(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Status Ketersediaan:
              </label>
              <select
                value={isAvailable ? '1' : '0'}
                onChange={(e) => setIsAvailable(e.target.value === '1')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="1">Tersedia (Available)</option>
                <option value="0">Tersewa (Sold Out)</option>
              </select>
            </div>
          </div>

          {/* Foto Konstruksi & Google Drive Links */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                Foto Konstruksi & Dokumentasi Lapangan (Opsional):
              </label>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {imageUrls.length} Foto Ditambahkan
              </span>
            </div>

            {/* Drag & Drop File-Input-like Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileSelect(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-50/60' 
                  : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  Klik untuk pilih file foto atau seret (drag & drop) ke sini
                </div>
                <div className="text-[10px] text-slate-500">
                  Mendukung JPG, PNG, WEBP langsung dari perangkat Anda
                </div>
              </div>
            </div>

            {/* URL or Google Drive Link Input Box */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-slate-500" />
                Atau masukkan tautan Google Drive / Web Image URL:
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddUrl();
                      }
                    }}
                    placeholder="https://drive.google.com/file/d/... atau https://example.com/foto.jpg"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {isGoogleDriveUrl(urlInput) ? (
                      <HardDrive className="w-3.5 h-3.5 text-sky-500" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddUrl}
                  disabled={!urlInput.trim()}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Tautan
                </button>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                <span className="font-semibold text-sky-700 bg-sky-50 border border-sky-200/60 px-1.5 py-0.2 rounded">
                  Google Drive Support
                </span>
                <span>Tautan share Google Drive otomatis dikonversi ke format pratinjau langsung.</span>
              </div>
            </div>

            {/* List of Added Photos */}
            {imageUrls.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-semibold text-slate-700">
                  Daftar Foto Terunggah ({imageUrls.length} Foto):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                  {imageUrls.map((photoUrl, idx) => {
                    const formatted = formatImageUrl(photoUrl);
                    const source = getPhotoSourceLabel(photoUrl);
                    const isPrimary = idx === 0;

                    return (
                      <div
                        key={idx}
                        className={`relative p-2 rounded-lg border flex items-center gap-2 bg-white transition-all ${
                          isPrimary ? 'border-emerald-400 ring-1 ring-emerald-400/40' : 'border-slate-200'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative">
                          <img
                            src={formatted}
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // If image fails to load, show generic placeholder
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isPrimary ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {isPrimary ? '★ Foto Utama' : `Foto #${idx + 1}`}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5" title={photoUrl}>
                            {source.label}
                          </div>
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(idx)}
                              className="text-[10px] text-emerald-600 hover:text-emerald-700 font-semibold hover:underline mt-0.5 block"
                            >
                              Jadikan Foto Utama
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                          title="Hapus Foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AI Security Alert Warning */}
          {aiWarning && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{aiWarning}</span>
            </div>
          )}

          {/* AI Guardrail Info */}
          <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Proteksi Keamanan AI: Geofence Jabar & Sanitasi Otomatis Aktif</span>
            </div>
            <span className="font-semibold text-emerald-700">Gemini 3.8</span>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Memverifikasi AI...</span>
                </>
              ) : (
                <span>Simpan Titik Media</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
