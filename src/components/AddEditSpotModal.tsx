import React, { useState } from 'react';
import { X, PlusCircle, MapPin, Building, DollarSign, Layers, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { MediaSpot, MediaCategory, MediaType, LocationType, TrafficDensity } from '../types/ooh';
import { addNotification } from '../services/storageService';
import { auditSpotWithAI } from '../services/aiSecurityService';

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
  const [imageUrl, setImageUrl] = useState<string>(existingSpot?.imageUrl || '');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [aiWarning, setAiWarning] = useState<string | null>(null);

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
      imageUrl: imageUrl.trim() || undefined
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

          {/* Foto Konstruksi */}
          <div>
            <label className="font-semibold text-slate-800 block mb-1">
              URL Foto Lokasi / Konstruksi (Opsional):
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/foto-lokasi.jpg"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
            />
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
