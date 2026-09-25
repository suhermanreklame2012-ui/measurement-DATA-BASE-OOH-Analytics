import React, { useState, useEffect } from 'react';
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
  Share2,
  CheckCircle2,
  MapPin,
  Eye,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { 
  generateSpotWhatsAppWebUrl, 
  generateSpotWhatsAppMobileUrl, 
  getSpotDeepLink, 
  BUSINESS_WA_NUMBER 
} from '../utils/whatsapp';
import { formatCompactIDR, formatCompactNumber } from '../utils/formatters';

interface SpotQrCodeGeneratorProps {
  spot: MediaSpot;
  onClose?: () => void;
  isCompact?: boolean;
}

export type QrTargetMode = 'mobile_spec' | 'whatsapp_mobile' | 'whatsapp_web';

export const SpotQrCodeGenerator: React.FC<SpotQrCodeGeneratorProps> = ({
  spot,
  onClose,
  isCompact = false
}) => {
  // Default to 'mobile_spec' so prospective clients immediately view media details on mobile
  const [qrType, setQrType] = useState<QrTargetMode>('mobile_spec');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Compute active target URL
  const targetUrl = React.useMemo(() => {
    switch (qrType) {
      case 'mobile_spec':
        return getSpotDeepLink(spot.id);
      case 'whatsapp_mobile':
        return generateSpotWhatsAppMobileUrl(spot);
      case 'whatsapp_web':
        return generateSpotWhatsAppWebUrl(spot);
      default:
        return getSpotDeepLink(spot.id);
    }
  }, [spot, qrType]);

  // Generate high-resolution QR code whenever target URL changes
  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    QRCode.toDataURL(targetUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#090d16', // Deep slate for high contrast scanner readability
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H', // High error correction level for reliable scanning in sunlight / camera shake
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

  // Copy encoded target URL to clipboard
  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(targetUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = targetUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setCopyToast('Tautan langsung berhasil disalin!');
      setTimeout(() => {
        setCopied(false);
        setCopyToast(null);
      }, 2500);
    } catch (err) {
      console.error('Failed to copy target URL:', err);
    }
  };

  // Download high-resolution QR code PNG image
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    const typeSuffix = qrType === 'mobile_spec' ? 'Mobile-Spec' : qrType === 'whatsapp_mobile' ? 'WA-Chat' : 'WA-Web';
    link.download = `QR-${spot.id}-${typeSuffix}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCopyToast('Gambar QR Code PNG berhasil diunduh!');
    setTimeout(() => setCopyToast(null), 3000);
  };

  // Direct preview in new tab
  const handleOpenDirect = () => {
    window.open(targetUrl, '_blank');
  };

  // Share via WhatsApp with prospect
  const handleShareToClientWa = () => {
    const text = `Halo, berikut adalah QR Code & tautan detail spesifikasi lengkap untuk titik reklame *${spot.name}* (${spot.city}):\n\n🔗 ${targetUrl}\n\nSilakan buka tautan di atas untuk melihat foto konstruksi, estimasi impresi harian, dan tarif resmi. Hubungi Suherman: 0878-2224-8975.`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <div 
      id="spot-qr-code-container"
      data-testid="spot-qr-code-container"
      className="bg-slate-900 border border-slate-700/90 rounded-2xl p-4 sm:p-5 text-slate-100 shadow-2xl space-y-4 relative overflow-hidden"
    >
      {/* Toast Feedback */}
      {copyToast && (
        <div className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] shadow-lg flex items-center gap-1.5 animate-in fade-in duration-150">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-emerald-950/40 shrink-0">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>QR Code Deep-Link Perangkat Lapangan (Mobile Pass)</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                ID: {spot.id}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pindai QR ini dengan smartphone agen lapangan atau klien untuk membuka detail spesifikasi lengkap, foto konstruksi, dan tarif sewa secara instan.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup panel QR Code"
          >
            ✕
          </button>
        )}
      </div>

      {/* Mode Selector Tabs (Mobile Spec Deep-Link vs WA Chat vs WA Web) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-semibold">
        {/* Tab 1: Mobile Spec Sheet (Direct Deep Link) */}
        <button
          type="button"
          id="btn-qr-tab-deep-link"
          data-testid="btn-qr-tab-deep-link"
          onClick={() => setQrType('mobile_spec')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition-all cursor-pointer ${
            qrType === 'mobile_spec'
              ? 'bg-emerald-600 text-white shadow-sm font-bold ring-1 ring-emerald-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="QR langsung membuka tampilan spesifikasi lengkap di browser smartphone lapangan via Deep-Link"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>📱 Deep-Link HP Lapangan</span>
        </button>

        {/* Tab 2: WhatsApp Mobile Deep Link */}
        <button
          type="button"
          id="btn-qr-tab-whatsapp-mobile"
          data-testid="btn-qr-tab-whatsapp-mobile"
          onClick={() => setQrType('whatsapp_mobile')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition-all cursor-pointer ${
            qrType === 'whatsapp_mobile'
              ? 'bg-[#25D366] text-slate-950 shadow-sm font-bold ring-1 ring-emerald-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="QR membuka aplikasi WhatsApp HP dengan pesan konsultasi otomatis ke Suherman"
        >
          <MessageCircle className="w-3.5 h-3.5 fill-current" />
          <span>💬 Chat WhatsApp Klien</span>
        </button>

        {/* Tab 3: WhatsApp Web Laptop */}
        <button
          type="button"
          id="btn-qr-tab-whatsapp-web"
          data-testid="btn-qr-tab-whatsapp-web"
          onClick={() => setQrType('whatsapp_web')}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg transition-all cursor-pointer ${
            qrType === 'whatsapp_web'
              ? 'bg-indigo-600 text-white shadow-sm font-bold ring-1 ring-indigo-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Buka obrolan WhatsApp Web langsung di komputer sales"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>💻 WhatsApp Web Laptop</span>
        </button>
      </div>

      {/* Main Content Layout: QR Canvas + Mobile Scanning Guide */}
      <div className="flex flex-col md:flex-row items-center gap-5 p-4 bg-slate-950/90 border border-slate-800 rounded-xl">
        
        {/* QR Code Canvas Card */}
        <div className="flex flex-col items-center shrink-0">
          <div className="p-3 bg-white rounded-2xl shadow-xl border-2 border-slate-700/60 flex flex-col items-center justify-center relative group">
            {isGenerating ? (
              <div className="w-48 h-48 sm:w-52 sm:h-52 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-semibold">Membuat QR Unik...</span>
              </div>
            ) : qrDataUrl ? (
              <>
                <img
                  src={qrDataUrl}
                  alt={`QR Code Spesifikasi Media ${spot.name}`}
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain block transition-transform group-hover:scale-102"
                />
                <div className="text-[10px] font-bold text-slate-800 tracking-tight mt-1 flex items-center gap-1">
                  <span>SUHERMAN REKLAME OOH</span>
                </div>
              </>
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-rose-500 text-xs">
                Gagal memuat QR Code
              </div>
            )}
          </div>

          {/* Status Badge below QR */}
          <div className="mt-2.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-emerald-300 flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Siap Dipindai Kamera HP</span>
          </div>
        </div>

        {/* Information & Action Guide */}
        <div className="flex-1 space-y-3 w-full text-xs">
          {/* Target Mode Info Banner */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                {qrType === 'mobile_spec'
                  ? '🎯 Akses Halaman Detail Media (Deep Link)'
                  : qrType === 'whatsapp_mobile'
                  ? '📱 Chat WhatsApp Calon Klien (wa.me)'
                  : '💻 WhatsApp Web Browser Laptop'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                {spot.city}
              </span>
            </div>

            <div className="font-bold text-white text-sm">
              {spot.name}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-300 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" />
                {spot.mediaType} ({spot.size})
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3 h-3 text-blue-400" />
                ~{formatCompactNumber(spot.dailyImpressions)} OTS/hari
              </span>
              <span>•</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatCompactIDR(spot.pricing.oneMonth)}/bln
              </span>
            </div>
          </div>

          {/* Guided Scan Steps for Field Agents & Prospects */}
          <div className="p-3 bg-slate-900/70 border border-slate-800/80 rounded-xl space-y-2">
            <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cara Memindai QR di Lapangan (Field Agents & Klien):</span>
            </div>

            <ol className="text-[11px] text-slate-300 space-y-1 pl-1 list-decimal list-inside">
              <li>
                Buka aplikasi kamera bawaan smartphone (*iPhone Camera* atau *Google Lens / Kamera Android*).
              </li>
              <li>
                Arahkan lensa kamera ke gambar QR Code di samping.
              </li>
              <li>
                {qrType === 'mobile_spec' ? (
                  <span>
                    Ketuk banner tautan deep-link yang muncul untuk <strong className="text-emerald-300">langsung membuka modal spesifikasi, foto konstruksi, peta lokasi, dan tarif resmi</strong> titik ini di browser ponsel secara instan.
                  </span>
                ) : qrType === 'whatsapp_mobile' ? (
                  <span>
                    Ketuk tautan untuk membuka aplikasi WhatsApp ponsel dengan pesan penawaran resmi terisi otomatis ke kontak Suherman (<strong className="text-emerald-300">0878-2224-8975</strong>).
                  </span>
                ) : (
                  <span>
                    Buka tautan di peramban komputer/laptop sales untuk memulai obrolan WhatsApp Web.
                  </span>
                )}
              </li>
            </ol>
          </div>

          {/* Encoded Deep-Link URL Strip */}
          <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-2 font-mono text-[10px] text-slate-400 overflow-hidden">
            <div className="truncate flex-1" title={targetUrl}>
              <span className="text-emerald-400 select-none">Deep-Link: </span>
              <span className="text-slate-200">{targetUrl}</span>
            </div>
            <button
              type="button"
              id="btn-qr-copy-deep-link"
              data-testid="btn-qr-copy-deep-link"
              onClick={handleCopyUrl}
              className="text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
              title="Salin tautan deep-link ini ke clipboard"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
          </div>

          {/* Quick Action Buttons Strip */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Action 1: Open Direct / Mobile Preview */}
            <button
              type="button"
              id="btn-qr-test-deep-link"
              data-testid="btn-qr-test-deep-link"
              onClick={handleOpenDirect}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              title="Uji buka langsung tautan deep-link QR ini di tab baru browser untuk simulasi pemindaian ponsel"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Uji Buka Deep-Link</span>
            </button>

            {/* Action 2: Share link to WhatsApp */}
            <button
              type="button"
              id="btn-qr-share-whatsapp"
              data-testid="btn-qr-share-whatsapp"
              onClick={handleShareToClientWa}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold rounded-lg text-xs transition-all active:scale-95 cursor-pointer"
              title="Kirim tautan dan QR titik ini ke WhatsApp calon klien"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan WA</span>
            </button>

            {/* Action 3: Download QR PNG */}
            <button
              type="button"
              id="btn-qr-download-png"
              data-testid="btn-qr-download-png"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Unduh file gambar QR Code beresolusi tinggi (PNG) untuk dicetak pada label inspeksi tiang / brosur"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Unduh PNG</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
