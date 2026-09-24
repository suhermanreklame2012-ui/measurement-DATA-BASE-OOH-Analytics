import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageCircle, 
  Globe, 
  Smartphone, 
  Monitor,
  Sparkles,
  Share2
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { 
  generateSpotWhatsAppWebUrl, 
  generateSpotWhatsAppMobileUrl, 
  getSpotDeepLink, 
  BUSINESS_WA_NUMBER,
  openSpotDirectWhatsApp 
} from '../utils/whatsapp';

interface SpotQrCodeGeneratorProps {
  spot: MediaSpot;
  onClose?: () => void;
  isCompact?: boolean;
}

export const SpotQrCodeGenerator: React.FC<SpotQrCodeGeneratorProps> = ({
  spot,
  onClose,
  isCompact = false
}) => {
  const [qrType, setQrType] = useState<'whatsapp_web' | 'whatsapp_mobile' | 'weblink'>('whatsapp_web');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Determine which URL to encode based on mode
  const targetUrl = qrType === 'whatsapp_web'
    ? generateSpotWhatsAppWebUrl(spot)
    : qrType === 'whatsapp_mobile'
    ? generateSpotWhatsAppMobileUrl(spot)
    : getSpotDeepLink(spot.id);

  // Generate QR Code whenever spot or qrType changes
  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(targetUrl, {
      width: 420,
      margin: 2,
      color: {
        dark: '#0f172a', // slate-900 high contrast
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then((url: string) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err: Error) => {
        console.error('Failed to generate QR Code:', err);
        if (isMounted) {
          setIsGenerating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [targetUrl]);

  // Copy encoded URL to clipboard
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download QR Code image
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    const typeLabel = qrType === 'whatsapp_web' ? 'WhatsApp-Web' : qrType === 'whatsapp_mobile' ? 'WhatsApp-Mobile' : 'Portal';
    link.download = `QR-${spot.id}-${typeLabel}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenDirect = () => {
    window.open(targetUrl, '_blank');
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 text-slate-100 shadow-2xl space-y-4">
      {/* Header with WhatsApp Web motif */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366]">
            <MessageCircle className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Integrasi WhatsApp Web & QR Scan</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-semibold">
                web.whatsapp.com
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Buka obrolan langsung di WhatsApp Web komputer Anda atau pindai QR dengan kamera telepon
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Target Type Selector Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/70 border border-slate-800 rounded-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => setQrType('whatsapp_web')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all cursor-pointer ${
            qrType === 'whatsapp_web'
              ? 'bg-[#25D366] text-slate-950 shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Tautan langsung ke WhatsApp Web (web.whatsapp.com) dengan teks otomatis"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>WhatsApp Web</span>
        </button>

        <button
          type="button"
          onClick={() => setQrType('whatsapp_mobile')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all cursor-pointer ${
            qrType === 'whatsapp_mobile'
              ? 'bg-emerald-600 text-white shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Deep Link wa.me untuk scan kamera HP atau aplikasi seluler"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>WhatsApp HP (wa.me)</span>
        </button>

        <button
          type="button"
          onClick={() => setQrType('weblink')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg transition-all cursor-pointer ${
            qrType === 'weblink'
              ? 'bg-blue-600 text-white shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Tautan detail web portal titik reklame"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Portal Web Unit</span>
        </button>
      </div>

      {/* Main QR Display Layout (Inspired by WhatsApp Web scan view) */}
      <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-950/80 border border-slate-800/90 rounded-xl">
        {/* QR Code Container */}
        <div className="relative group shrink-0">
          <div className="p-3 bg-white rounded-xl shadow-lg border-2 border-slate-700/50 flex items-center justify-center">
            {isGenerating ? (
              <div className="w-48 h-48 sm:w-52 sm:h-52 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-medium">Menyusun QR Code...</span>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code untuk ${spot.name}`}
                className="w-48 h-48 sm:w-52 sm:h-52 object-contain block"
              />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-rose-400 text-xs">
                Gagal memuat QR
              </div>
            )}
          </div>

          {/* Quick badge on QR */}
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-[#25D366] shadow-md flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
            <span>WA: 0878-2224-8975 (Suherman)</span>
          </div>
        </div>

        {/* QR Information & Guide - Styled like WhatsApp Web Login Guide */}
        <div className="flex-1 space-y-3 text-xs w-full">
          <div>
            <div className="text-[10px] text-[#25D366] font-mono uppercase tracking-wider font-semibold">
              {qrType === 'whatsapp_web' ? 'WhatsApp Web Intent' : qrType === 'whatsapp_mobile' ? 'Mobile WA Deep Link' : 'Web URL'}
            </div>
            <div className="font-bold text-white text-sm mt-0.5">
              {spot.name} ({spot.city})
            </div>
            <div className="text-[11px] text-slate-300">
              {spot.mediaType} • {spot.size} • Impresi ~{spot.dailyImpressions?.toLocaleString('id-ID')} OTS
            </div>
          </div>

          {/* Step-by-step instructions like WhatsApp Web */}
          <div className="p-3 bg-slate-900/95 border border-slate-800 rounded-xl space-y-2">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center text-[10px] font-bold">
                ✓
              </span>
              <span>Langkah Cepat Terhubung:</span>
            </div>

            <ol className="text-[11px] text-slate-300 space-y-1.5 pl-1.5 list-decimal list-inside">
              <li>
                {qrType === 'whatsapp_web' ? (
                  <>
                    Klik tombol <strong className="text-[#25D366]">Buka WhatsApp Web</strong> di bawah untuk langsung membuka chat di browser komputer ini.
                  </>
                ) : (
                  <>
                    Buka kamera ponsel Anda dan arahkan ke QR Code di sebelah kiri.
                  </>
                )}
              </li>
              <li>
                Ketuk tautan untuk membuka obrolan ke nomor <span className="font-mono text-emerald-300 font-semibold">0878-2224-8975 (a.n. Suherman)</span>.
              </li>
              <li>
                Pesan telah terisi otomatis dengan spesifikasi, tarif, dan foto media reklame ini. Cukup tekan tombol kirim!
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleOpenDirect}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
              title="Buka langsung tautan WhatsApp Web di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka WhatsApp Web</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Unduh berkas gambar QR Code format PNG beresolusi tinggi"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh</span>
            </button>

            <button
              type="button"
              onClick={handleCopyUrl}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
              title="Salin tautan yang dikodekan ke clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Salin Tautan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

