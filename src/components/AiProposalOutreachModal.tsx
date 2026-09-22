import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  Send,
  MessageSquare,
  Mail,
  Copy,
  Check,
  Users,
  Plus,
  Trash2,
  Edit2,
  Phone,
  Building,
  MapPin,
  Clock,
  Eye,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  MessageCircle
} from 'lucide-react';
import { 
  MediaSpot, 
  ClientContact, 
  ProposalDuration, 
  ProposalTone, 
  ProposalDraft 
} from '../types/ooh';
import { 
  getStoredClients, 
  saveClientContact, 
  deleteClientContact, 
  recordProposalSent,
  subscribeToClients 
} from '../services/clientService';
import { 
  syncGoogleContactsToApp, 
  getLastContactsSyncInfo, 
  ContactsSyncResult 
} from '../services/googleContactsService';
import { getAccessToken, googleSignIn } from '../services/googleAuthService';
import { generateProposalDraft, generateLocalProposalFallback } from '../services/aiProposalService';
import { formatIDR, formatCompactNumber } from '../utils/formatters';
import { addNotification, getStoredSpots, saveStoredSpots } from '../services/storageService';
import { GoogleDrivePhotoPickerModal } from './GoogleDrivePhotoPickerModal';
import { BUSINESS_WA_NUMBER } from '../utils/whatsapp';
import { calculateUnifiedProposalAnalytics } from '../utils/audienceDemographics';
import { generateExecutiveProposalPDF } from '../utils/proposalPdfExport';
import { formatImageUrl, getSpotImageUrl, getAllSpotImages } from '../utils/imageUtils';
import {
  FileDown,
  ShieldCheck,
  BarChart3,
  Layers,
  Compass,
  CheckSquare,
  Square,
  Share2,
  PieChart as PieIcon,
  Award,
  Car,
  Building2,
  ZoomIn,
  Image as ImageIcon,
  Maximize2,
  Download,
  HardDrive
} from 'lucide-react';

interface AiProposalOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSpots: MediaSpot[];
  allSpots: MediaSpot[];
  onUpdateSelectedSpots?: (spots: MediaSpot[]) => void;
}

export const AiProposalOutreachModal: React.FC<AiProposalOutreachModalProps> = ({
  isOpen,
  onClose,
  selectedSpots,
  allSpots,
  onUpdateSelectedSpots
}) => {
  // Clients state
  const [clients, setClients] = useState<ClientContact[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState<string>('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState<boolean>(false);

  // Contact modal state (Add / Edit contact)
  const [isContactFormOpen, setIsContactFormOpen] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<Partial<ClientContact> | null>(null);

  // Proposal Configuration State
  const [duration, setDuration] = useState<ProposalDuration>('1 Bulan');
  const [tone, setTone] = useState<ProposalTone>('formal');
  const [customNote, setCustomNote] = useState<string>('');

  // Active spots list for this proposal
  const [proposalSpots, setProposalSpots] = useState<MediaSpot[]>([]);
  const [spotSearch, setSpotSearch] = useState<string>('');
  const [isSpotPickerOpen, setIsSpotPickerOpen] = useState<boolean>(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [proposalDraft, setProposalDraft] = useState<ProposalDraft | null>(null);
  const [activeTab, setActiveTab] = useState<'deck' | 'whatsapp' | 'email' | 'contacts'>('deck');

  // Editable drafts
  const [whatsappContent, setWhatsappContent] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');

  // Feedback states
  const [copiedWA, setCopiedWA] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [copiedDeck, setCopiedDeck] = useState<boolean>(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);

  // Photo Lightbox Preview State
  const [previewPhotoSpot, setPreviewPhotoSpot] = useState<{ spot: MediaSpot; photoUrl: string } | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  // Google Drive photo picker states (suherman.reklame2012@gmail.com)
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState<boolean>(false);
  const [drivePickerTargetSpot, setDrivePickerTargetSpot] = useState<MediaSpot | null>(null);

  const handleDrivePhotoSelected = (photoUrl: string, _photoItem: any, spotId?: string) => {
    const targetId = spotId || drivePickerTargetSpot?.id;
    if (!targetId) return;

    setProposalSpots((prev) =>
      prev.map((s) => {
        if (s.id === targetId) {
          return {
            ...s,
            imageUrl: photoUrl,
            imageUrls: [photoUrl, ...(s.imageUrls || []).filter((u) => u !== photoUrl)]
          };
        }
        return s;
      })
    );

    // Persist to global storage
    try {
      const allCurrent = getStoredSpots();
      const updated = allCurrent.map((s) => {
        if (s.id === targetId) {
          return {
            ...s,
            imageUrl: photoUrl,
            imageUrls: [photoUrl, ...(s.imageUrls || []).filter((u) => u !== photoUrl)]
          };
        }
        return s;
      });
      saveStoredSpots(updated);
    } catch (e) {
      console.warn('Storage update notice:', e);
    }

    if (onUpdateSelectedSpots) {
      onUpdateSelectedSpots(
        proposalSpots.map((s) =>
          s.id === targetId
            ? { ...s, imageUrl: photoUrl, imageUrls: [photoUrl, ...(s.imageUrls || []).filter((u) => u !== photoUrl)] }
            : s
        )
      );
    }
  };

  const handleBatchSyncDrivePhotos = (assignments: Array<{ spotId: string; photoUrl: string }>) => {
    const map = new Map(assignments.map((a) => [a.spotId, a.photoUrl]));
    const nextSpots = proposalSpots.map((s) => {
      if (map.has(s.id)) {
        const photoUrl = map.get(s.id)!;
        return {
          ...s,
          imageUrl: photoUrl,
          imageUrls: [photoUrl, ...(s.imageUrls || []).filter((u) => u !== photoUrl)]
        };
      }
      return s;
    });
    setProposalSpots(nextSpots);
    if (onUpdateSelectedSpots) onUpdateSelectedSpots(nextSpots);

    try {
      const allCurrent = getStoredSpots();
      const updated = allCurrent.map((s) => {
        if (map.has(s.id)) {
          const photoUrl = map.get(s.id)!;
          return {
            ...s,
            imageUrl: photoUrl,
            imageUrls: [photoUrl, ...(s.imageUrls || []).filter((u) => u !== photoUrl)]
          };
        }
        return s;
      });
      saveStoredSpots(updated);
    } catch (e) {
      console.warn('Batch storage update notice:', e);
    }
  };

  // Google Contacts Sync states
  const [isSyncingContacts, setIsSyncingContacts] = useState<boolean>(false);
  const [lastContactsSync, setLastContactsSync] = useState(getLastContactsSyncInfo());
  const [contactsFilter, setContactsFilter] = useState<'all' | 'google' | 'local'>('all');
  const [contactsSearchQuery, setContactsSearchQuery] = useState<string>('');

  // Handler for syncing Google Contacts
  const handleSyncGoogleContacts = async () => {
    setIsSyncingContacts(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const authRes = await googleSignIn();
        if (!authRes?.accessToken) {
          throw new Error('Izin akses akun Google suherman.reklame2012@gmail.com diperlukan.');
        }
        token = authRes.accessToken;
      }

      const result = await syncGoogleContactsToApp(token);
      setLastContactsSync({
        timestamp: result.syncedAt,
        totalSynced: result.totalGoogleFetched
      });
      setSendSuccessMessage(
        `Sinkronisasi Google Contacts berhasil! ${result.totalGoogleFetched} kontak disinkronkan dari suherman.reklame2012@gmail.com (${result.newCount} baru, ${result.updatedCount} diperbarui).`
      );
    } catch (err: any) {
      console.error('Failed to sync Google Contacts:', err);
      alert(err?.message || 'Gagal menyinkronkan kontak dari Google Contacts. Pastikan izin telah diberikan.');
    } finally {
      setIsSyncingContacts(false);
    }
  };

  // Filtered contacts list in the contacts tab
  const filteredContactsTabList = useMemo(() => {
    let list = clients;
    if (contactsFilter === 'google') {
      list = list.filter((c) => c.id.startsWith('gc_'));
    } else if (contactsFilter === 'local') {
      list = list.filter((c) => !c.id.startsWith('gc_'));
    }
    if (contactsSearchQuery.trim()) {
      const q = contactsSearchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          (c.role && c.role.toLowerCase().includes(q)) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.notes && c.notes.toLowerCase().includes(q))
      );
    }
    return list;
  }, [clients, contactsFilter, contactsSearchQuery]);

  const googleContactsCount = useMemo(() => {
    return clients.filter((c) => c.id.startsWith('gc_')).length;
  }, [clients]);

  // Subscribe to real-time client contacts
  useEffect(() => {
    const unsub = subscribeToClients((loaded) => {
      setClients(loaded);
      if (loaded.length > 0 && !selectedClientId) {
        setSelectedClientId(loaded[0].id);
      }
    });
    return () => unsub();
  }, []);

  // Sync selected spots whenever modal opens - STRICT: Only use spots explicitly marked by user
  useEffect(() => {
    if (isOpen) {
      if (selectedSpots && selectedSpots.length > 0) {
        setProposalSpots(selectedSpots);
      } else {
        // Enforce constraint: Locations can ONLY be sent from marked/selected spots
        setProposalSpots([]);
      }
      setProposalDraft(null);
      setSendSuccessMessage(null);
      setActiveTab('deck');
    }
  }, [isOpen, selectedSpots]);

  // Unified Traffic, Demographic, and Financial Analytics for the marked spots
  const unifiedAnalytics = useMemo(() => {
    return calculateUnifiedProposalAnalytics(proposalSpots, duration);
  }, [proposalSpots, duration]);

  // Best Value spot in proposal based on impressions-per-price ratio
  const bestValueProposalSpotId = useMemo(() => {
    if (proposalSpots.length <= 1) return null;
    let maxRatio = -1;
    let bestId: string | null = null;
    proposalSpots.forEach((s) => {
      const price = duration === '3 Bulan'
        ? (s.pricing?.threeMonths || s.pricing.oneMonth * 3)
        : duration === '6 Bulan'
        ? (s.pricing?.sixMonths || s.pricing.oneMonth * 6)
        : duration === '1 Tahun'
        ? (s.pricing?.oneYear || s.pricing.oneMonth * 12)
        : s.pricing.oneMonth;
      const ratio = (s.dailyImpressions * 30) / (price || 1);
      if (ratio > maxRatio) {
        maxRatio = ratio;
        bestId = s.id;
      }
    });
    return bestId;
  }, [proposalSpots, duration]);

  // Selected client object
  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || clients[0] || null;
  }, [clients, selectedClientId]);

  // Auto initialize proposal text if spots are marked
  useEffect(() => {
    if (isOpen && proposalSpots.length > 0 && activeClient && !whatsappContent) {
      const initial = generateLocalProposalFallback({
        client: activeClient,
        spots: proposalSpots,
        duration,
        tone,
        customNote
      });
      setProposalDraft(initial);
      setWhatsappContent(initial.whatsappText);
      setEmailSubject(initial.emailSubject);
      setEmailBody(initial.emailBody);
    }
  }, [isOpen, proposalSpots, activeClient, duration, tone, whatsappContent]);

  // Filtered clients for dropdown/list
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  // Available spots to add
  const unselectedSpots = useMemo(() => {
    const currentIds = new Set(proposalSpots.map((s) => s.id));
    return allSpots.filter((s) => !currentIds.has(s.id));
  }, [allSpots, proposalSpots]);

  const filteredUnselectedSpots = useMemo(() => {
    if (!spotSearch.trim()) return unselectedSpots.slice(0, 10);
    const q = spotSearch.toLowerCase();
    return unselectedSpots
      .filter((s) => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q))
      .slice(0, 10);
  }, [unselectedSpots, spotSearch]);

  if (!isOpen) return null;

  // Add / Remove spots
  const handleRemoveSpot = (spotId: string) => {
    const next = proposalSpots.filter((s) => s.id !== spotId);
    setProposalSpots(next);
    if (onUpdateSelectedSpots) onUpdateSelectedSpots(next);
  };

  const handleAddSpot = (spot: MediaSpot) => {
    const next = [...proposalSpots, spot];
    setProposalSpots(next);
    setIsSpotPickerOpen(false);
    setSpotSearch('');
    if (onUpdateSelectedSpots) onUpdateSelectedSpots(next);
  };

  // Generate Draft via AI Service
  const handleGenerateDraft = async () => {
    if (!activeClient) {
      alert('Silakan pilih klien tujuan terlebih dahulu.');
      return;
    }
    if (proposalSpots.length === 0) {
      alert('Pilih minimal 1 titik media reklame untuk penawaran.');
      return;
    }

    setIsGenerating(true);
    setSendSuccessMessage(null);

    try {
      const draft = await generateProposalDraft({
        client: activeClient,
        spots: proposalSpots,
        duration,
        tone,
        customNote
      });

      setProposalDraft(draft);
      setWhatsappContent(draft.whatsappText);
      setEmailSubject(draft.emailSubject);
      setEmailBody(draft.emailBody);
      setActiveTab('whatsapp');
    } catch (err) {
      console.error('Failed to generate draft:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Clean phone number for WhatsApp
  const cleanPhoneForWhatsApp = (phone: string): string => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (!clean.startsWith('62')) {
      clean = '62' + clean;
    }
    return clean;
  };

  // Send directly via WhatsApp
  const handleSendViaWhatsApp = async () => {
    if (!activeClient || !activeClient.phone) {
      alert('Nomor WhatsApp klien belum diisi.');
      return;
    }

    const cleanPhone = cleanPhoneForWhatsApp(activeClient.phone);
    const encodedText = encodeURIComponent(whatsappContent);
    const waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

    window.open(waUrl, '_blank');

    // Record proposal sent
    await recordProposalSent(activeClient.id);
    addNotification({
      title: 'Penawaran Dikirim via WhatsApp Web',
      message: `Penawaran OOH/DOOH untuk ${activeClient.name} (${activeClient.company}) berhasil diteruskan ke WhatsApp Web.`,
      type: 'system'
    });

    setSendSuccessMessage(`Tautan WhatsApp Web dibuka untuk ${activeClient.name}! Riwayat kontak berhasil diperbarui.`);
  };

  // Send copy to office Business WhatsApp Web (+62 87822248975)
  const handleSendToBusinessWA = () => {
    if (!whatsappContent) return;
    const encodedText = encodeURIComponent(whatsappContent);
    window.open(`https://web.whatsapp.com/send?phone=${BUSINESS_WA_NUMBER}&text=${encodedText}`, '_blank');
    setSendSuccessMessage(`Membuka percakapan ke WhatsApp Web Bisnis (+62 87822248975)!`);
  };

  // Send directly via Email
  const handleSendViaEmail = async () => {
    if (!activeClient || !activeClient.email) {
      alert('Alamat email klien belum diisi.');
      return;
    }

    const mailtoUrl = `mailto:${encodeURIComponent(activeClient.email)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;

    window.location.href = mailtoUrl;

    // Record proposal sent
    await recordProposalSent(activeClient.id);
    addNotification({
      title: 'Penawaran Dikirim via Email',
      message: `Draft penawaran ${activeClient.company} siap dikirim ke ${activeClient.email}.`,
      type: 'system'
    });

    setSendSuccessMessage(`Klien email dibuka untuk ${activeClient.email}! Riwayat kontak berhasil diperbarui.`);
  };

  // Copy WhatsApp
  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(whatsappContent);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2200);
  };

  // Copy Email
  const handleCopyEmail = () => {
    const full = `Subjek: ${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(full);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2200);
  };

  // Download PDF Executive Proposal
  const handleDownloadPDF = async () => {
    if (!activeClient) return;
    if (proposalSpots.length === 0) {
      alert('Pilih dan tandai minimal 1 titik media reklame terlebih dahulu.');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      await generateExecutiveProposalPDF(activeClient, proposalSpots, unifiedAnalytics, duration, customNote);
      addNotification({
        title: 'PDF Proposal Eksekutif Dibuat',
        message: `Proposal resmi ${proposalSpots.length} titik dengan foto visual untuk ${activeClient.company} berhasil diunduh.`,
        type: 'create'
      });
    } catch (err) {
      console.error('Failed to export proposal PDF:', err);
      addNotification({
        title: 'Gagal Mengunduh PDF',
        message: 'Terjadi kendala saat memproses dokumen PDF.',
        type: 'system'
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Copy Executive Proposal Summary
  const handleCopyDeckSummary = () => {
    if (!activeClient || proposalSpots.length === 0) return;
    const summaryText = `*PROPOSAL EKSEKUTIF MEDIA LUAR RUANG (OOH & DOOH) JAWA BARAT*
Ref: PROP-OOH-${Date.now().toString().slice(-6)} | Durasi: ${duration}
Klien: ${activeClient.name} (${activeClient.company})

📊 KESATUAN ANALISA TRAFFIC & DEMOGRAFI AUDIENS (${proposalSpots.length} Titik Ditandai):
• Total Estimasi Impresi: ${formatCompactNumber(unifiedAnalytics.totalMonthlyImpressions)} OTS/bulan (~${formatCompactNumber(unifiedAnalytics.totalDailyImpressions)} OTS/hari)
• Volume Lalu Lintas Koridor: ~${formatCompactNumber(unifiedAnalytics.totalMonthlyTraffic)} kend./bulan (~${formatCompactNumber(unifiedAnalytics.totalDailyTraffic)} kend./hari)
• Karakteristik Koridor: Rerata Dwell Time ${unifiedAnalytics.demographics.averageDwellTimeSec} detik di persimpangan, Index Visibilitas ${unifiedAnalytics.demographics.averageVisibilityScore}/100
• Profil Demografi: Dominan SES A & B (${unifiedAnalytics.demographics.sesA + unifiedAnalytics.demographics.sesB}%), Usia Produktif 20-45 thn (Profesional, Komuter, Pebisnis)
• Total Investasi Paket: ${formatIDR(unifiedAnalytics.financials.packageTotalCost)} (Efisiensi CPM: Rp ${unifiedAnalytics.financials.effectiveCPM} / 1k OTS)

📍 DAFTAR TITIK PILIHAN:
${proposalSpots.map((s, idx) => `${idx + 1}. ${s.name} (${s.city}) - ${s.mediaType} (${s.size}) | ${formatCompactNumber(s.dailyImpressions)} OTS/hari`).join('\n')}

🛡️ JAMINAN SUHERMAN REKLAME:
✅ Pajak Reklame Resmi & Izin Pemda Jawa Barat
✅ Garansi Penerangan Malam / Operasional Layar LED Prima
✅ Laporan Monitoring Foto Berkala (Day & Night)

Kontak: Suherman Reklame (WA: 0812-3456-7890 / 0878-2224-8975)`;

    navigator.clipboard.writeText(summaryText);
    setCopiedDeck(true);
    setTimeout(() => setCopiedDeck(false), 2200);
  };

  // Save new/edit client contact
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !editingContact.name || !editingContact.company) return;

    const contactToSave: ClientContact = {
      id: editingContact.id || `CLI-${Date.now().toString().slice(-4)}`,
      name: editingContact.name.trim(),
      company: editingContact.company.trim(),
      role: editingContact.role?.trim() || 'Pic Brand / Media Planner',
      phone: editingContact.phone?.trim() || '',
      email: editingContact.email?.trim() || '',
      category: editingContact.category || 'Korporat',
      notes: editingContact.notes?.trim() || '',
      createdAt: editingContact.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      proposalsSentCount: editingContact.proposalsSentCount || 0,
      lastProposalAt: editingContact.lastProposalAt
    };

    await saveClientContact(contactToSave);
    setSelectedClientId(contactToSave.id);
    setIsContactFormOpen(false);
    setEditingContact(null);

    addNotification({
      title: 'Kontak Klien Diperbarui',
      message: `Data klien ${contactToSave.name} (${contactToSave.company}) tersimpan di Firestore & lokal.`,
      type: 'create'
    });
  };

  const handleDeleteContact = async (clientId: string) => {
    if (window.confirm('Hapus kontak klien ini dari buku alamat?')) {
      await deleteClientContact(clientId);
      if (selectedClientId === clientId) {
        const remaining = clients.filter((c) => c.id !== clientId);
        if (remaining.length > 0) setSelectedClientId(remaining[0].id);
      }
    }
  };

  // Metrics summary
  const totalDailyTraffic = proposalSpots.reduce((acc, s) => acc + (s.dailyTraffic || 0), 0);
  const totalDailyImpressions = proposalSpots.reduce((acc, s) => acc + (s.dailyImpressions || 0), 0);
  const totalMonthlyPrice = proposalSpots.reduce((acc, s) => {
    if (duration === '3 Bulan') return acc + (s.pricing?.threeMonths || (s.pricing?.oneMonth || 0) * 3);
    if (duration === '6 Bulan') return acc + (s.pricing?.sixMonths || (s.pricing?.oneMonth || 0) * 6);
    if (duration === '1 Tahun') return acc + (s.pricing?.oneYear || (s.pricing?.oneMonth || 0) * 12);
    return acc + (s.pricing?.oneMonth || 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-slate-900 border border-slate-700/80 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Penawaran Klien & AI Outreach OOH
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Gemini 3.8
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Susun draft penawaran personal WhatsApp & Email otomatis berdasarkan inventaris titik reklame
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split 2 Columns */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 text-xs">
          
          {/* Left Column: Configuration & Spot Selection (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-4.5 overflow-y-auto">
            
            {/* Step 1: Client Selector & Contact Management */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Klien Penerima Penawaran
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingContact({
                        category: 'Korporat',
                        role: 'Media Planner'
                      });
                      setIsContactFormOpen(true);
                    }}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Tambah Kontak
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('contacts')}
                    className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Buku Kontak ({clients.length})
                  </button>
                </div>
              </div>

              {/* Client Dropdown Box */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className="w-full text-left bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 rounded-xl p-3 flex items-center justify-between text-xs transition-colors"
                >
                  {activeClient ? (
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="font-bold text-white truncate">{activeClient.company}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {activeClient.name} • {activeClient.role || activeClient.category}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400">Pilih kontak klien...</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {/* Dropdown Menu */}
                {isClientDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-100">
                    <div className="p-2 border-b border-slate-700/80 flex items-center gap-2 bg-slate-900/60">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari perusahaan atau nama klien..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-52 overflow-y-auto p-1 divide-y divide-slate-700/40">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => {
                            setSelectedClientId(client.id);
                            setIsClientDropdownOpen(false);
                            setClientSearch('');
                          }}
                          className={`p-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                            client.id === selectedClientId
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'hover:bg-slate-700/60 text-slate-300'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-white truncate">{client.company}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {client.name} ({client.phone || client.email})
                            </div>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 shrink-0">
                            {client.category}
                          </span>
                        </div>
                      ))}
                      {filteredClients.length === 0 && (
                        <div className="p-3 text-center text-slate-500 text-[11px]">
                          Kontak tidak ditemukan.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Active Client Info Chip */}
              {activeClient && (
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 text-[11px] flex items-center justify-between">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">WA:</span>
                      <span className="text-slate-200 font-mono font-medium">{activeClient.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-slate-200 truncate">{activeClient.email || '-'}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingContact(activeClient);
                      setIsContactFormOpen(true);
                    }}
                    className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition-colors"
                    title="Ubah info kontak"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Selected Media Spots (STRICT SELECTION ONLY) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    Titik Ditandai ({proposalSpots.length})
                  </label>
                  <span className="text-[10px] text-slate-400 block">
                    Hanya titik yang ditandai yang diproses & dikirim
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDrivePickerTargetSpot(proposalSpots[0] || null);
                      setIsDrivePickerOpen(true);
                    }}
                    className="text-[11px] font-semibold text-sky-300 hover:text-sky-200 flex items-center gap-1 transition-colors px-2 py-1 rounded bg-sky-950/70 border border-sky-500/40 hover:border-sky-500/70 cursor-pointer shadow-xs"
                    title="Ambil foto lokasi resmi dari Google Drive suherman.reklame2012@gmail.com"
                  >
                    <HardDrive className="w-3 h-3 text-sky-400" />
                    <span>Drive Foto</span>
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsSpotPickerOpen(!isSpotPickerOpen)}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors px-2 py-1 rounded bg-slate-800 border border-emerald-500/30 hover:border-emerald-500/60"
                    >
                      <Plus className="w-3 h-3" />
                      Tandai Titik
                    </button>

                  {/* Spot Picker Popover */}
                  {isSpotPickerOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 animate-in fade-in duration-100">
                      <div className="p-1.5 border-b border-slate-700 flex items-center gap-1.5">
                        <Search className="w-3 h-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Cari titik OOH untuk ditandai..."
                          value={spotSearch}
                          onChange={(e) => setSpotSearch(e.target.value)}
                          className="w-full bg-transparent text-[11px] text-white focus:outline-none"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto mt-1 divide-y divide-slate-700/50">
                        {filteredUnselectedSpots.map((spot) => (
                          <div
                            key={spot.id}
                            onClick={() => handleAddSpot(spot)}
                            className="p-2 hover:bg-slate-700/60 rounded-lg cursor-pointer transition-colors flex items-center gap-2.5"
                          >
                            <img
                              src={getSpotImageUrl(spot)}
                              alt={spot.name}
                              referrerPolicy="no-referrer"
                              className="w-10 h-9 rounded-md object-cover border border-slate-700 shrink-0 bg-slate-900"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-white truncate text-[11px]">{spot.name}</div>
                              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                                <span>{spot.city} • {spot.mediaType}</span>
                                <span className="font-mono text-emerald-400">{formatCompactNumber(spot.dailyImpressions)} OTS</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredUnselectedSpots.length === 0 && (
                          <div className="p-2 text-center text-slate-500 text-[10px]">
                            Semua titik sudah dipilih atau tidak ditemukan.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
                </div>

              {/* Spots List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {proposalSpots.map((spot, idx) => (
                  <div
                    key={spot.id}
                    className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/70 flex items-center justify-between gap-2.5 hover:border-emerald-500/40 transition-colors group"
                  >
                    {/* Checkbox and Photo Thumbnail */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemoveSpot(spot.id)}
                        className="text-emerald-400 hover:text-rose-400 transition-colors shrink-0"
                        title="Klik untuk menghapus tanda titik"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>

                      {/* Location Photo Thumbnail */}
                      <div
                        onClick={() => {
                          setPreviewPhotoSpot({ spot, photoUrl: getSpotImageUrl(spot) });
                          setActivePhotoIndex(0);
                        }}
                        className="relative w-14 h-12 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden shrink-0 cursor-pointer group-hover:border-emerald-400/80 transition-all shadow-xs"
                        title="Klik untuk melihat foto lokasi"
                      >
                        <img
                          src={getSpotImageUrl(spot)}
                          alt={spot.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
                          }}
                        />
                        <span className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded bg-slate-950/80 text-white font-mono text-[8px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ZoomIn className="w-3.5 h-3.5 text-emerald-300 drop-shadow" />
                        </div>
                      </div>
                    </div>

                    {/* Spot Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs truncate" title={spot.name}>
                          {spot.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                        <span>{spot.city}</span>
                        <span>•</span>
                        <span className="text-slate-300 font-medium">{spot.mediaType}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-mono font-medium">
                          {formatCompactNumber(spot.dailyImpressions)} OTS
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewPhotoSpot({ spot, photoUrl: getSpotImageUrl(spot) });
                            setActivePhotoIndex(0);
                          }}
                          className="text-[9px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Eye className="w-2.5 h-2.5" />
                          <span>Lihat Foto</span>
                        </button>
                        <span className="text-slate-600 text-[9px]">•</span>
                        <button
                          type="button"
                          onClick={() => {
                            setDrivePickerTargetSpot(spot);
                            setIsDrivePickerOpen(true);
                          }}
                          className="text-[9px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                          title="Ambil atau ganti foto titik ini dari Google Drive suherman.reklame2012@gmail.com"
                        >
                          <HardDrive className="w-2.5 h-2.5 text-sky-400" />
                          <span>Pilih dari Drive</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSpot(spot.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 rounded transition-colors shrink-0"
                      title="Hapus dari daftar penawaran"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {proposalSpots.length === 0 && (
                  <div className="p-4 rounded-lg border border-dashed border-amber-500/40 bg-amber-950/20 text-center text-amber-300 text-xs space-y-1">
                    <div className="font-bold flex items-center justify-center gap-1.5 text-amber-200">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      Mode Proteksi Seleksi Aktif
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Proposal OOH/DOOH hanya dikirimkan untuk titik yang Anda tandai. Belum ada titik yang ditandai. Klik <strong>"+ Tandai Titik"</strong> di atas atau centang titik di tabel media.
                    </p>
                  </div>
                )}
              </div>

              {/* Spots Metric Summary Strip */}
              {proposalSpots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1 text-[10px]">
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded p-2 text-center">
                    <span className="text-slate-400 block">Titik Ditandai</span>
                    <strong className="text-white text-xs">{proposalSpots.length} Titik</strong>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded p-2 text-center">
                    <span className="text-slate-400 block">Est. OTS / Hari</span>
                    <strong className="text-emerald-400 text-xs">{formatCompactNumber(totalDailyImpressions)} OTS</strong>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-700/40 rounded p-2 text-center">
                    <span className="text-slate-400 block">Total Paket ({duration})</span>
                    <strong className="text-amber-400 text-xs">{formatCompactNumber(totalMonthlyPrice)}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Proposal Configurations */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-3">
                
                {/* Duration */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Durasi Penawaran
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value as ProposalDuration)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="1 Bulan">1 Bulan (Standar)</option>
                    <option value="3 Bulan">3 Bulan (Diskon 5%)</option>
                    <option value="6 Bulan">6 Bulan (Diskon 10%)</option>
                    <option value="1 Tahun">1 Tahun (Diskon 15%)</option>
                  </select>
                </div>

                {/* Tone */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Gaya Bahasa (Tone)
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as ProposalTone)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="formal">Formal & Eksekutif</option>
                    <option value="persuasive">Persuasif & Enerjik</option>
                    <option value="direct">Ringkas & To-The-Point</option>
                  </select>
                </div>

              </div>

              {/* Custom Sales Note */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Catatan Tambahan Sales / Promo Khusus (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Diskon khusus 10% untuk closing minggu ini, materi siap cetak"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={isGenerating || proposalSpots.length === 0 || !activeClient}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50 mt-1 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Gemini AI Sedang Menganalisa Traffic & Demografi...</span>
                  </>
                ) : proposalSpots.length === 0 ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>Tandai Minimal 1 Titik Terlebih Dahulu</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>{proposalDraft ? 'Susun Ulang AI Proposal Terpadu' : 'Buat Proposal Terpadu dengan AI'}</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Right Column: AI Output & Direct Actions (7 cols) */}
          <div className="lg:col-span-7 p-5 flex flex-col justify-between space-y-4">
            
            {/* View Tabs: Proposal Deck vs WhatsApp vs Email vs Contact Manager */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('deck')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'deck'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Deck Proposal Eksekutif (1 Kesatuan)
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('whatsapp')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'whatsapp'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Template WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('email')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'email'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Template Email
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('contacts')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === 'contacts'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Buku Kontak Klien
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={proposalSpots.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer"
                    title="Cetak & Unduh Dokumen PDF Resmi Penawaran"
                  >
                    <FileDown className="w-3.5 h-3.5 text-emerald-100" />
                    <span>Unduh PDF Resmi</span>
                  </button>
                </div>
              </div>

              {/* Feedback Alert if sent */}
              {sendSuccessMessage && (
                <div className="p-3 mb-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{sendSuccessMessage}</span>
                </div>
              )}

              {/* TAB 0: UNIFIED PROPOSAL DECK (TRAFFIC + DEMOGRAFI 1 KESATUAN) */}
              {activeTab === 'deck' && (
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  
                  {/* Top Deck Banner & Quick Actions */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/80 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                          Proposal Media Strategis OOH / DOOH
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Klien: <strong className="text-white">{activeClient?.name}</strong> ({activeClient?.company})
                        </span>
                        <span className="text-[10px] text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30 font-medium">
                          Paket {duration}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Sistem menyatukan analitika volume lalu lintas, klasifikasi SES audiens, estimasi impresi OTS, serta katalog spesifikasi fisik titik media terpilih ke dalam satu kesatuan dokumen profesional.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={proposalSpots.length === 0 || isGeneratingPdf}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
                        title="Unduh Executive Proposal Resmi dalam format PDF (Lengkap dengan Lampiran Foto Lokasi)"
                      >
                        {isGeneratingPdf ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Menyusun PDF & Foto...</span>
                          </>
                        ) : (
                          <>
                            <FileDown className="w-3.5 h-3.5" />
                            <span>Unduh PDF Proposal</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyDeckSummary}
                        disabled={proposalSpots.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
                        title="Salin ringkasan proposal ke clipboard"
                      >
                        {copiedDeck ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Salin Ringkasan</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('whatsapp')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/40 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Kirim WA</span>
                      </button>
                    </div>
                  </div>

                  {proposalSpots.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                      <ShieldCheck className="w-10 h-10 mx-auto text-amber-400" />
                      <div className="text-sm text-slate-200 font-bold">
                        Belum Ada Titik Media yang Ditandai
                      </div>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Sesuai standar operasional OOH Suherman Reklame, penawaran harga dan data analitika hanya diproses untuk titik-titik yang secara eksplisit Anda tandai.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsSpotPickerOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tandai Titik Reklame Sekarang</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Section A: 4 Executive KPI Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            Titik Ditandai
                          </span>
                          <div className="text-base font-bold text-white mt-0.5">
                            {unifiedAnalytics.totalSpots} Titik Strategis
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {proposalSpots.filter((s) => s.category === 'DOOH_DIGITAL').length} DOOH • {proposalSpots.filter((s) => s.category !== 'DOOH_DIGITAL').length} Statis
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Eye className="w-3 h-3 text-blue-400" />
                            Total Jangkauan (OTS)
                          </span>
                          <div className="text-base font-bold text-emerald-400 mt-0.5 font-mono">
                            {formatCompactNumber(unifiedAnalytics.totalMonthlyImpressions)} OTS
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            ~{formatCompactNumber(unifiedAnalytics.totalDailyImpressions)} OTS / Hari
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Car className="w-3 h-3 text-amber-400" />
                            Volume Trafik Koridor
                          </span>
                          <div className="text-base font-bold text-amber-300 mt-0.5 font-mono">
                            ~{formatCompactNumber(unifiedAnalytics.totalMonthlyTraffic)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Kendaraan / Bulan di Koridor
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-emerald-400" />
                            Total Nilai Investasi
                          </span>
                          <div className="text-base font-bold text-white mt-0.5 font-mono">
                            {formatIDR(unifiedAnalytics.financials.packageTotalCost)}
                          </div>
                          <div className="text-[10px] text-emerald-400 mt-0.5 font-medium">
                            CPM Rp {unifiedAnalytics.financials.effectiveCPM} (Hemat {unifiedAnalytics.financials.discountPercentage}%)
                          </div>
                        </div>
                      </div>

                      {/* Section B: Unified Intelligence (Traffic & Demografi 1 Kesatuan) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        
                        {/* Traffic & Mobility Dynamics */}
                        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                              <Car className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Karakteristik & Mobilitas Trafik</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                              Real Telemetry
                            </span>
                          </div>

                          {/* Modal Split */}
                          <div className="space-y-1.5 text-[11px]">
                            <div className="text-slate-400 text-[10px] font-medium">Komposisi Kendaraan di Koridor:</div>
                            <div className="space-y-1">
                              <div>
                                <div className="flex justify-between text-[10px] text-slate-300">
                                  <span>Sepeda Motor (Mobilitas Harian)</span>
                                  <span className="font-mono font-bold">67%</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-1.5 mt-0.5">
                                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '67%' }}></div>
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[10px] text-slate-300">
                                  <span>Mobil Penumpang & Pribadi</span>
                                  <span className="font-mono font-bold">25%</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-1.5 mt-0.5">
                                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '25%' }}></div>
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between text-[10px] text-slate-300">
                                  <span>Angkutan Umum, Bis & Logistik</span>
                                  <span className="font-mono font-bold">8%</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-1.5 mt-0.5">
                                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '8%' }}></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/40 text-[10px]">
                            <div className="bg-slate-900/60 p-2 rounded">
                              <span className="text-slate-400 block">Dwell Time di Persimpangan:</span>
                              <strong className="text-white text-[11px] font-mono">
                                ~{unifiedAnalytics.demographics.averageDwellTimeSec} Detik
                              </strong>
                            </div>
                            <div className="bg-slate-900/60 p-2 rounded">
                              <span className="text-slate-400 block">Index Visibilitas Sudut:</span>
                              <strong className="text-emerald-400 text-[11px] font-mono">
                                {unifiedAnalytics.demographics.averageVisibilityScore} / 100
                              </strong>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-400 bg-slate-900/40 p-2 rounded flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Jam Paparan Prima: <strong>{unifiedAnalytics.demographics.peakTrafficHours}</strong></span>
                          </div>
                        </div>

                        {/* Audience Demographics & Socio-Economic Status (SES) */}
                        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                              <Users className="w-3.5 h-3.5 text-blue-400" />
                              <span>Profil Demografi & Sosio-Ekonomi (SES)</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-500/40">
                              Audience Profiling
                            </span>
                          </div>

                          {/* SES Segment Bar */}
                          <div className="space-y-1">
                            <div className="text-slate-400 text-[10px] font-medium">Distribusi Sosio-Ekonomi (SES):</div>
                            <div className="flex items-center h-2 rounded-full overflow-hidden bg-slate-900">
                              <div 
                                style={{ width: `${unifiedAnalytics.demographics.sesA}%` }} 
                                className="bg-emerald-500 h-full" 
                                title={`SES A: ${unifiedAnalytics.demographics.sesA}%`} 
                              />
                              <div 
                                style={{ width: `${unifiedAnalytics.demographics.sesB}%` }} 
                                className="bg-blue-500 h-full" 
                                title={`SES B: ${unifiedAnalytics.demographics.sesB}%`} 
                              />
                              <div 
                                style={{ width: `${unifiedAnalytics.demographics.sesC}%` }} 
                                className="bg-slate-600 h-full" 
                                title={`SES C+: ${unifiedAnalytics.demographics.sesC}%`} 
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono pt-0.5">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                SES A: {unifiedAnalytics.demographics.sesA}%
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                SES B: {unifiedAnalytics.demographics.sesB}%
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                                SES C+: {unifiedAnalytics.demographics.sesC}%
                              </span>
                            </div>
                          </div>

                          {/* Age & Persona */}
                          <div className="space-y-1 pt-1 border-t border-slate-700/40 text-[10px]">
                            <div className="text-slate-400 font-medium">Kelompok Usia Dominan:</div>
                            <div className="grid grid-cols-3 gap-1 text-center font-mono">
                              <div className="bg-slate-900/60 p-1.5 rounded">
                                <span className="text-slate-400 block text-[9px]">25-39 Thn</span>
                                <strong className="text-white text-xs">48%</strong>
                              </div>
                              <div className="bg-slate-900/60 p-1.5 rounded">
                                <span className="text-slate-400 block text-[9px]">18-24 Thn</span>
                                <strong className="text-white text-xs">24%</strong>
                              </div>
                              <div className="bg-slate-900/60 p-1.5 rounded">
                                <span className="text-slate-400 block text-[9px]">40-54 Thn</span>
                                <strong className="text-white text-xs">21%</strong>
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-300 bg-slate-900/40 p-2 rounded">
                            <span className="text-slate-400 block">Persona Target Audiens:</span>
                            <span className="font-semibold text-emerald-300">
                              Eksekutif, Profesional Muda, Komuter Harian, & Urban Shoppers
                            </span>
                          </div>

                        </div>

                      </div>

                      {/* Section C: Detailed Catalog for Marked Spots */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                            Katalog Spesifikasi Titik Media Terpilih ({proposalSpots.length} Titik Ditandai)
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Koridor: {unifiedAnalytics.citiesCovered.join(', ')}
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {proposalSpots.map((spot, idx) => {
                            const isDooh = spot.category === 'DOOH_DIGITAL';
                            const spotPrice = duration === '3 Bulan'
                              ? (spot.pricing?.threeMonths || spot.pricing.oneMonth * 3)
                              : duration === '6 Bulan'
                              ? (spot.pricing?.sixMonths || spot.pricing.oneMonth * 6)
                              : duration === '1 Tahun'
                              ? (spot.pricing?.oneYear || spot.pricing.oneMonth * 12)
                              : spot.pricing.oneMonth;

                            return (
                              <div
                                key={spot.id}
                                className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                              >
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  {/* Spot Thumbnail */}
                                  <div
                                    onClick={() => {
                                      setPreviewPhotoSpot({ spot, photoUrl: getSpotImageUrl(spot) });
                                      setActivePhotoIndex(0);
                                    }}
                                    className="w-20 h-16 rounded-xl bg-slate-900 border border-slate-700/80 overflow-hidden shrink-0 relative flex items-center justify-center cursor-pointer group hover:border-emerald-400 transition-all shadow-xs"
                                    title="Klik untuk memperbesar gambar lokasi"
                                  >
                                    <img
                                      src={getSpotImageUrl(spot)}
                                      alt={spot.name}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
                                      }}
                                    />
                                    <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-slate-900/90 text-white font-mono text-[9px] flex items-center justify-center font-bold">
                                      {idx + 1}
                                    </span>
                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                      <ZoomIn className="w-4 h-4 text-emerald-300 drop-shadow" />
                                    </div>
                                  </div>

                                  {/* Spot Info */}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-white text-xs truncate">
                                        {spot.name}
                                      </span>
                                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                        isDooh
                                          ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40'
                                          : 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                                      }`}>
                                        {isDooh ? 'DOOH VIDEOTRON' : spot.mediaType}
                                      </span>
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-mono">
                                        {spot.size}
                                      </span>
                                      {spot.id === bestValueProposalSpotId && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center gap-1 shadow-2xs">
                                          <Sparkles className="w-2.5 h-2.5 text-slate-950 fill-slate-950" />
                                          Best Value
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                                      {spot.roadName}, {spot.district}, {spot.city} • {spot.orientation}
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 font-mono flex-wrap">
                                      <span className="text-emerald-400 font-medium">
                                        OTS: {formatCompactNumber(spot.dailyImpressions)} / hari
                                      </span>
                                      <span>•</span>
                                      <span>Trafik: {formatCompactNumber(spot.dailyTraffic)} kend./hari</span>
                                      <span>•</span>
                                      <span className="text-blue-300">Zonasi: {spot.locationType}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Pricing & Action */}
                                <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/60 gap-1">
                                  <div>
                                    <div className="text-xs font-bold text-white font-mono">
                                      {formatIDR(spotPrice)}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      Tarif {duration}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreviewPhotoSpot({ spot, photoUrl: getSpotImageUrl(spot) });
                                        setActivePhotoIndex(0);
                                      }}
                                      className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
                                      title="Lihat foto resolusi tinggi"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Foto HD</span>
                                    </button>

                                    <a
                                      href={`https://maps.google.com/?q=${spot.coordinates.lat},${spot.coordinates.lng}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Maps</span>
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Section D: Guarantee & Legal Protection Strip */}
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div>
                            <strong className="text-white block text-xs">Jaminan Layanan All-In Suherman Reklame</strong>
                            <span>Termasuk Pajak Reklame Resmi Pemda Jabar, Izin Penyelenggaraan, & Garansi Penerangan Malam / Operasional Layar LED.</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPdf}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer disabled:opacity-50"
                            title="Unduh Executive Proposal Resmi dalam format PDF (Lengkap dengan Lampiran Foto Lokasi)"
                          >
                            {isGeneratingPdf ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Menyusun Dokumen & Foto...</span>
                              </>
                            ) : (
                              <>
                                <FileDown className="w-3.5 h-3.5" />
                                <span>Unduh PDF Proposal (+ Lampiran Foto)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                    </>
                  )}

                </div>
              )}

              {/* TAB 1: WHATSAPP TEMPLATE */}
              {activeTab === 'whatsapp' && (
                <div className="space-y-3">
                  {/* Photo Documentation Strip */}
                  {proposalSpots.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Dokumentasi Gambar Lokasi Titik Terpilih ({proposalSpots.length} Titik)</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Klik gambar untuk resolusi HD
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {proposalSpots.map((spot, sIdx) => {
                          const spotImg = getSpotImageUrl(spot);
                          return (
                            <div
                              key={spot.id}
                              className="bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden group hover:border-emerald-500/50 transition-all shadow-xs"
                            >
                              <div
                                onClick={() => {
                                  setPreviewPhotoSpot({ spot, photoUrl: spotImg });
                                  setActivePhotoIndex(0);
                                }}
                                className="relative h-20 w-full bg-slate-900 cursor-pointer overflow-hidden"
                                title="Klik untuk melihat foto resolusi tinggi"
                              >
                                <img
                                  src={spotImg}
                                  alt={spot.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
                                  }}
                                />
                                <div className="absolute top-1 left-1 px-1 rounded bg-slate-950/80 text-white font-mono text-[8px] font-bold">
                                  #{sIdx + 1}
                                </div>
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-3.5 h-3.5 text-emerald-300 drop-shadow" />
                                </div>
                              </div>

                              <div className="p-1.5 space-y-0.5">
                                <div className="text-[11px] font-semibold text-white truncate" title={spot.name}>
                                  {spot.name}
                                </div>
                                <div className="text-[9px] text-slate-400 flex items-center justify-between">
                                  <span>{spot.city}</span>
                                  <span className="text-emerald-400 font-mono font-medium">{formatCompactNumber(spot.dailyImpressions)} OTS</span>
                                </div>
                                <div className="pt-1 flex items-center justify-between border-t border-slate-800 text-[9px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewPhotoSpot({ spot, photoUrl: spotImg });
                                      setActivePhotoIndex(0);
                                    }}
                                    className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Eye className="w-2.5 h-2.5" />
                                    Foto HD
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(spotImg);
                                      alert(`Link foto ${spot.name} berhasil disalin!`);
                                    }}
                                    className="text-slate-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                                    title="Salin tautan gambar lokasi"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                    Salin Link
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-emerald-400" />
                      Teks WhatsApp Siap Kirim ke {activeClient?.phone || 'Klien'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {whatsappContent.length} karakter
                    </span>
                  </div>

                  <textarea
                    rows={14}
                    value={whatsappContent}
                    onChange={(e) => setWhatsappContent(e.target.value)}
                    placeholder="Klik tombol 'Buat Draft Penawaran dengan AI' di sebelah kiri untuk menghasilkan draf WhatsApp..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none focus:border-emerald-500 resize-none font-mono selection:bg-emerald-900"
                  />

                  {/* WhatsApp Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyWhatsApp}
                        disabled={!whatsappContent}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {copiedWA ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tersalin ke Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Salin Teks WhatsApp</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSendToBusinessWA}
                        disabled={!whatsappContent}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/30 transition-colors disabled:opacity-40 cursor-pointer"
                        title="Kirim atau arsipkan salinan penawaran ke WhatsApp Bisnis (+62 87822248975)"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                        <span>Kirim ke WA Bisnis</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendViaWhatsApp}
                      disabled={!whatsappContent || !activeClient?.phone}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-950/50 transition-all disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim ke Kontak Klien</span>
                      <ExternalLink className="w-3 h-3 text-emerald-200" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: EMAIL TEMPLATE */}
              {activeTab === 'email' && (
                <div className="space-y-3">
                  {/* Photo Documentation Strip */}
                  {proposalSpots.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                          <span>Dokumentasi Gambar Lokasi Reklame Terpilih ({proposalSpots.length} Titik)</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Klik gambar untuk resolusi HD
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {proposalSpots.map((spot, sIdx) => {
                          const spotImg = getSpotImageUrl(spot);
                          return (
                            <div
                              key={spot.id}
                              className="bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden group hover:border-blue-500/50 transition-all shadow-xs"
                            >
                              <div
                                onClick={() => {
                                  setPreviewPhotoSpot({ spot, photoUrl: spotImg });
                                  setActivePhotoIndex(0);
                                }}
                                className="relative h-20 w-full bg-slate-900 cursor-pointer overflow-hidden"
                                title="Klik untuk melihat foto resolusi tinggi"
                              >
                                <img
                                  src={spotImg}
                                  alt={spot.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
                                  }}
                                />
                                <div className="absolute top-1 left-1 px-1 rounded bg-slate-950/80 text-white font-mono text-[8px] font-bold">
                                  #{sIdx + 1}
                                </div>
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-3.5 h-3.5 text-blue-300 drop-shadow" />
                                </div>
                              </div>

                              <div className="p-1.5 space-y-0.5">
                                <div className="text-[11px] font-semibold text-white truncate" title={spot.name}>
                                  {spot.name}
                                </div>
                                <div className="text-[9px] text-slate-400 flex items-center justify-between">
                                  <span>{spot.city}</span>
                                  <span className="text-blue-400 font-mono font-medium">{formatCompactNumber(spot.dailyImpressions)} OTS</span>
                                </div>
                                <div className="pt-1 flex items-center justify-between border-t border-slate-800 text-[9px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewPhotoSpot({ spot, photoUrl: spotImg });
                                      setActivePhotoIndex(0);
                                    }}
                                    className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Eye className="w-2.5 h-2.5" />
                                    Foto HD
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(spotImg);
                                      alert(`Link foto ${spot.name} berhasil disalin!`);
                                    }}
                                    className="text-slate-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                                    title="Salin tautan gambar lokasi"
                                  >
                                    <Copy className="w-2.5 h-2.5" />
                                    Salin Link
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Subjek Email
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Subjek proposal penawaran..."
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-2.5 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Isi Pesan Email Resmi
                    </label>
                    <textarea
                      rows={11}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Klik tombol 'Buat Draft Penawaran dengan AI' untuk menyusun email penawaran..."
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none focus:border-blue-500 resize-none font-mono"
                    />
                  </div>

                  {/* Email Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      disabled={!emailBody}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors disabled:opacity-40"
                    >
                      {copiedEmail ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-blue-400" />
                          <span>Subjek & Isi Email Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Salin Draft Email</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleSendViaEmail}
                      disabled={!emailBody || !activeClient?.email}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-950/50 transition-all disabled:opacity-40"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Buka & Kirim via Email App</span>
                      <ExternalLink className="w-3 h-3 text-blue-200" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTACT MANAGEMENT */}
              {activeTab === 'contacts' && (
                <div className="space-y-3.5">
                  
                  {/* Google Contacts Sync Banner */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-600/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs">
                            Buku Kontak Google (People API)
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-mono">
                            suherman.reklame2012@gmail.com
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Sinkronkan buku kontak alamat email dan nomor telepon klien langsung ke sistem penawaran OOH.
                        </p>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>
                            {lastContactsSync 
                              ? `Terakhir sinkron: ${new Date(lastContactsSync.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} (${googleContactsCount} kontak Google aktif)`
                              : `Belum disinkronkan (${googleContactsCount} kontak terdeteksi)`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSyncGoogleContacts}
                      disabled={isSyncingContacts}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
                      title="Tarik data buku kontak dari suherman.reklame2012@gmail.com"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingContacts ? 'animate-spin' : ''}`} />
                      <span>{isSyncingContacts ? 'Menyinkronkan...' : 'Sinkronkan Google Contacts'}</span>
                    </button>
                  </div>

                  {/* Header & New Contact Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        Daftar Klien ({filteredContactsTabList.length} dari {clients.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingContact({
                          category: 'Korporat',
                          role: 'Media Planner'
                        });
                        setIsContactFormOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold self-start sm:self-auto cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Klien Manual
                    </button>
                  </div>

                  {/* Search and Source Filter Tabs */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={contactsSearchQuery}
                        onChange={(e) => setContactsSearchQuery(e.target.value)}
                        placeholder="Cari kontak nama, perusahaan, telepon, atau email..."
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-8 pr-3 py-1.5 text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] shrink-0">
                      <button
                        type="button"
                        onClick={() => setContactsFilter('all')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          contactsFilter === 'all'
                            ? 'bg-slate-700 text-white shadow-2xs font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Semua ({clients.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactsFilter('google')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                          contactsFilter === 'google'
                            ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>Google Contacts ({googleContactsCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setContactsFilter('local')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          contactsFilter === 'local'
                            ? 'bg-slate-700 text-white shadow-2xs font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Lokal ({clients.length - googleContactsCount})
                      </button>
                    </div>
                  </div>

                  {/* Contacts List */}
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredContactsTabList.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          c.id === selectedClientId
                            ? 'bg-slate-800 border-emerald-500/50 shadow-sm'
                            : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-xs">{c.company}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                              {c.category}
                            </span>
                            {c.id.startsWith('gc_') && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold flex items-center gap-1">
                                <Users className="w-2.5 h-2.5" />
                                Google Contacts
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-300 mt-1 font-medium">
                            {c.name} {c.role ? `• ${c.role}` : ''}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap items-center gap-3 font-mono">
                            <span>📞 {c.phone || '-'}</span>
                            <span>✉️ {c.email || '-'}</span>
                            <span>📨 Penawaran: {c.proposalsSentCount || 0}x</span>
                          </div>
                          {c.notes && (
                            <div className="text-[10px] text-slate-400 mt-1.5 italic bg-slate-900/60 p-1.5 rounded">
                              "{c.notes}"
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {c.phone && (
                            <button
                              type="button"
                              onClick={() => {
                                const cleanNum = c.phone.replace(/[^0-9]/g, '');
                                const waNum = cleanNum.startsWith('0') ? '62' + cleanNum.substring(1) : cleanNum;
                                window.open(`https://web.whatsapp.com/send?phone=${waNum}`, '_blank');
                              }}
                              className="p-1.5 text-[#25D366] hover:bg-emerald-950/60 border border-emerald-500/20 rounded"
                              title="Chat Langsung via WhatsApp Web"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId(c.id);
                              setActiveTab('whatsapp');
                            }}
                            className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/40 text-emerald-300 text-[10px] font-semibold rounded cursor-pointer"
                          >
                            Pilih Klien
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContact(c);
                              setIsContactFormOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                            title="Edit Kontak"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(c.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-700"
                            title="Hapus Kontak"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {filteredContactsTabList.length === 0 && (
                      <div className="p-8 text-center text-slate-400 bg-slate-800/30 border border-slate-700/50 rounded-xl space-y-2">
                        <Users className="w-8 h-8 mx-auto text-slate-500" />
                        <div className="text-xs text-slate-300 font-semibold">Tidak ada kontak yang cocok</div>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          {contactsFilter === 'google'
                            ? 'Belum ada kontak Google. Klik tombol "Sinkronkan Google Contacts" di atas untuk menarik data dari suherman.reklame2012@gmail.com.'
                            : 'Coba ubah kata kunci pencarian atau filter kontak di atas.'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* AI Strategic Highlights Box (at bottom if available) */}
            {proposalDraft && activeTab !== 'contacts' && (
              <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  Keunggulan Strategis AI untuk {activeClient?.company}:
                </div>
                <div className="text-slate-300 leading-relaxed text-[11px]">
                  {proposalDraft.estimatedReachSummary}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div>
            Kirim penawaran langsung ke WhatsApp & Email klien dengan 1-klik tanpa aplikasi pihak ketiga.
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-medium transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* Add / Edit Contact Modal Overlay */}
      {isContactFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-5 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-white">
                {editingContact?.id ? 'Ubah Data Kontak Klien' : 'Tambah Kontak Klien Baru'}
              </h4>
              <button
                onClick={() => setIsContactFormOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Perusahaan / Brand *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bank BJB / PT Eigerindo"
                  value={editingContact?.company || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, company: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nama Kontak Person *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bpk. Hendra Wijaya"
                  value={editingContact?.name || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Jabatan / Role</label>
                  <input
                    type="text"
                    placeholder="Marketing Lead"
                    value={editingContact?.role || ''}
                    onChange={(e) => setEditingContact({ ...editingContact, role: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kategori Industri</label>
                  <select
                    value={editingContact?.category || 'Korporat'}
                    onChange={(e) => setEditingContact({ ...editingContact, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Otomotif">Otomotif</option>
                    <option value="Finansial & Perbankan">Finansial & Perbankan</option>
                    <option value="Retail & Fashion">Retail & Fashion</option>
                    <option value="FMCG & Kosmetik">FMCG & Kosmetik</option>
                    <option value="Properti">Properti</option>
                    <option value="Telekomunikasi">Telekomunikasi</option>
                    <option value="Agensi Iklan">Agensi Iklan</option>
                    <option value="Korporat">Korporat / Lainnya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nomor WhatsApp (Aktif) *</label>
                <input
                  type="text"
                  required
                  placeholder="081234567890"
                  value={editingContact?.phone || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Alamat Email</label>
                <input
                  type="email"
                  placeholder="kontak@perusahaan.co.id"
                  value={editingContact?.email || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Catatan Klien</label>
                <textarea
                  rows={2}
                  placeholder="Preferensi titik, preferensi ukuran, timeline promosi..."
                  value={editingContact?.notes || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white resize-none focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsContactFormOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow cursor-pointer"
                >
                  Simpan Kontak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL HD LOCATION PHOTO LIGHTBOX MODAL */}
      {previewPhotoSpot && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
            {/* Lightbox Header */}
            <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm sm:text-base truncate">
                    {previewPhotoSpot.spot.name}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    previewPhotoSpot.spot.category === 'DOOH_DIGITAL'
                      ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40'
                      : 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {previewPhotoSpot.spot.category === 'DOOH_DIGITAL' ? 'DOOH DIGITAL VIDEOTRON' : previewPhotoSpot.spot.mediaType}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>{previewPhotoSpot.spot.roadName}, {previewPhotoSpot.spot.district}, {previewPhotoSpot.spot.city}</span>
                  <span>•</span>
                  <span className="font-mono text-emerald-400">{previewPhotoSpot.spot.size}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`https://maps.google.com/?q=${previewPhotoSpot.spot.coordinates.lat},${previewPhotoSpot.spot.coordinates.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
                  title="Buka Google Maps"
                >
                  <Compass className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Survey Maps</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(previewPhotoSpot.photoUrl);
                    alert('Link gambar lokasi berhasil disalin ke clipboard!');
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  title="Salin Tautan Gambar"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Salin Link</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewPhotoSpot(null)}
                  className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Tutup Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Stage */}
            <div className="relative flex-1 bg-black/80 flex items-center justify-center p-3 sm:p-6 overflow-hidden min-h-[300px] max-h-[62vh]">
              <img
                src={previewPhotoSpot.photoUrl}
                alt={previewPhotoSpot.spot.name}
                referrerPolicy="no-referrer"
                className="max-h-[58vh] max-w-full object-contain rounded-lg shadow-2xl transition-all duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
                }}
              />
            </div>

            {/* Gallery Thumbnails (if spot has multiple photos) */}
            {(() => {
              const allImages = getAllSpotImages(previewPhotoSpot.spot);
              if (allImages.length > 1) {
                return (
                  <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider shrink-0 mr-1">
                      Foto Lainnya:
                    </span>
                    {allImages.map((imgUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setPreviewPhotoSpot({ ...previewPhotoSpot, photoUrl: imgUrl });
                          setActivePhotoIndex(i);
                        }}
                        className={`w-14 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                          previewPhotoSpot.photoUrl === imgUrl ? 'border-emerald-400 scale-105' : 'border-slate-700 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Foto ${i + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                );
              }
              return null;
            })()}

            {/* Lightbox Footer Specifications */}
            <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-slate-400 flex-wrap">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold font-mono">
                  <Eye className="w-3.5 h-3.5" />
                  {formatCompactNumber(previewPhotoSpot.spot.dailyImpressions)} OTS/hari
                </span>
                <span>•</span>
                <span className="text-slate-300">
                  Trafik: {formatCompactNumber(previewPhotoSpot.spot.dailyTraffic)} kendaraan/hari
                </span>
                <span>•</span>
                <span className="text-blue-300">
                  Arah Pandang: {previewPhotoSpot.spot.orientation}
                </span>
                <span>•</span>
                <span className="text-amber-300">
                  Penerangan: {previewPhotoSpot.spot.lightingType}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-bold text-white font-mono">
                    {formatIDR(previewPhotoSpot.spot.pricing.oneMonth)}
                  </div>
                  <div className="text-[10px] text-slate-400">Tarif 1 Bulan (Publish)</div>
                </div>

                <a
                  href={previewPhotoSpot.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Tab Baru</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Photo Picker Modal (suherman.reklame2012@gmail.com) */}
      <GoogleDrivePhotoPickerModal
        isOpen={isDrivePickerOpen}
        onClose={() => {
          setIsDrivePickerOpen(false);
          setDrivePickerTargetSpot(null);
        }}
        targetSpot={drivePickerTargetSpot || proposalSpots[0] || null}
        allSpots={proposalSpots}
        onSelectPhoto={handleDrivePhotoSelected}
        onBatchSyncPhotos={handleBatchSyncDrivePhotos}
      />

    </div>
  );
};
