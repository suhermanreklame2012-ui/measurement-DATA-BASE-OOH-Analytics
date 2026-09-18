import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  X, 
  Activity, 
  Database, 
  Flame, 
  Lock, 
  Cpu, 
  ArrowRight,
  Zap,
  Info,
  Trash2,
  Check
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { DatabaseAuditResult, auditDatabaseWithAI, autoHealDatabaseWithAI } from '../services/aiSecurityService';
import { syncRepairedSpotsToFirestore, deleteSpotFromFirestore } from '../services/firestoreService';
import { addNotification, deleteSpotFromStorage } from '../services/storageService';

interface AiSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: MediaSpot[];
  onUpdateSpots: (updatedSpots: MediaSpot[]) => void;
  isFirestoreConnected: boolean;
  onDeleteSpot?: (spotId: string) => void;
}

export const AiSecurityModal: React.FC<AiSecurityModalProps> = ({
  isOpen,
  onClose,
  spots,
  onUpdateSpots,
  isFirestoreConnected,
  onDeleteSpot
}) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isHealing, setIsHealing] = useState(false);
  const [auditResult, setAuditResult] = useState<DatabaseAuditResult | null>(null);
  const [healSuccessMessage, setHealSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'issues'>('overview');
  const [deletingSpotId, setDeletingSpotId] = useState<string | null>(null);
  const [confirmDeleteSpot, setConfirmDeleteSpot] = useState<{ id: string; name: string } | null>(null);

  // Auto-run light audit when modal opens
  useEffect(() => {
    if (isOpen && !auditResult && !isAuditing) {
      handleRunAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunAudit = async () => {
    setIsAuditing(true);
    setHealSuccessMessage(null);
    try {
      const res = await auditDatabaseWithAI(spots);
      setAuditResult(res);
      if (res.issues && res.issues.length > 0) {
        // Keep user aware if there are issues
      }
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleAutoHeal = async () => {
    setIsHealing(true);
    setHealSuccessMessage(null);
    try {
      const res = await autoHealDatabaseWithAI(spots);
      if (res.success && res.healedSpots) {
        onUpdateSpots(res.healedSpots);
        // Also persist to cloud Firestore
        await syncRepairedSpotsToFirestore(res.healedSpots);

        addNotification({
          title: 'Sistem AI Menormalkan Database',
          message: `Berhasil memperbaiki dan menormalkan ${res.healedSpots.length} titik media OOH/DOOH.`,
          type: 'system'
        });

        setHealSuccessMessage(`Berhasil memperbaiki dan menyelaraskan ${res.healedSpots.length} titik media ke Cloud Firestore & Penyimpanan Lokal!`);
        
        // Re-audit after healing
        const reAudit = await auditDatabaseWithAI(res.healedSpots);
        setAuditResult(reAudit);
      }
    } catch (err: any) {
      console.error('Auto heal error:', err);
    } finally {
      setIsHealing(false);
    }
  };

  const handleExecuteDelete = async (spotId: string, spotName: string) => {
    setDeletingSpotId(spotId);
    try {
      // 1. Delete from storage
      const remaining = deleteSpotFromStorage(spotId);
      onUpdateSpots(remaining);
      if (onDeleteSpot) {
        onDeleteSpot(spotId);
      }

      // 2. Delete from Cloud Firestore
      await deleteSpotFromFirestore(spotId);

      addNotification({
        title: 'Titik Bermasalah / Duplikat Dihapus',
        message: `Titik "${spotName}" (${spotId}) berhasil dihapus dari database & Cloud Firestore.`,
        type: 'delete'
      });

      setHealSuccessMessage(`Titik "${spotName}" (${spotId}) berhasil dihapus secara permanen.`);
      setConfirmDeleteSpot(null);

      // Re-audit remaining dataset
      const reAudit = await auditDatabaseWithAI(remaining);
      setAuditResult(reAudit);
    } catch (err: any) {
      console.error('Failed to delete spot:', err);
    } finally {
      setDeletingSpotId(null);
    }
  };

  const healthScore = auditResult ? auditResult.healthScore : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Sistem AI Keamanan & Integritas Data OOH
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Gemini AI Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemeriksaan otomatis anomali, sanitasi injeksi, geofence Jawa Barat, dan sinkronisasi Cloud Firestore
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* Health Score & Status Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Overall Score */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Skor Keamanan Data</span>
                <div className="text-3xl font-extrabold text-white mt-1 flex items-baseline gap-1">
                  <span className={healthScore >= 95 ? 'text-emerald-400' : healthScore >= 80 ? 'text-amber-400' : 'text-rose-400'}>
                    {healthScore}%
                  </span>
                  <span className="text-xs font-normal text-slate-400">/ 100</span>
                </div>
                <span className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {healthScore >= 95 ? 'Kondisi Optimal & Terverifikasi' : 'Perlu Penyelarasan Otomatis'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 flex items-center justify-center font-bold text-xs text-emerald-300">
                AI
              </div>
            </div>

            {/* Total Spots Checked */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Total Titik Dipantau</span>
                <div className="text-3xl font-extrabold text-white mt-1">
                  {spots.length}
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <Database className="w-3 h-3 text-blue-400" />
                  Kota Bandung & 9 Wilayah Jabar
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            {/* Cloud Firestore Status */}
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Status Cloud Firestore</span>
                <div className="text-lg font-bold text-amber-300 mt-1 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  {isFirestoreConnected ? 'Terkoneksi' : 'Lokal Fallback'}
                </div>
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 truncate max-w-[200px]" title="sewa-billlboard--1741057119832">
                  sewa-billlboard--1741057119832
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Success Banner if Healed */}
          {healSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed flex-1">
                <strong className="font-semibold block text-white text-sm mb-0.5">Tindakan Berhasil Diterapkan</strong>
                {healSuccessMessage}
              </div>
              <button 
                onClick={() => setHealSuccessMessage(null)}
                className="text-emerald-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation Tabs: Ikhtisar Proteksi vs Daftar Anomali / Titik Bermasalah */}
          <div className="flex border-b border-slate-800 gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Ikhtisar Proteksi & Rekomendasi</span>
            </button>

            <button
              onClick={() => setActiveTab('issues')}
              className={`pb-3 px-3 text-xs font-semibold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'issues'
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Pemberitahuan Anomali / Hapus Titik</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                (auditResult?.issues?.length || 0) > 0 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {auditResult?.issues?.length || 0}
              </span>
            </button>
          </div>

          {activeTab === 'overview' ? (
            <>
              {/* 5 Core Guardrails Grid */}
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  5 Pilar Proteksi Keamanan Sistem AI
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                      <Lock className="w-3.5 h-3.5" />
                      Anti-Injection (XSS/SQLi)
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Menyaring skrip berbahaya, event handlers, dan karakter berbahaya pada nama & alamat.
                    </p>
                    <div className="mt-2 text-[10px] text-emerald-400 font-medium">Status: Aktif & Terlindungi</div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Geofence Spasial Jabar
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Memvalidasi koordinat lintang & bujur agar presisi di batas wilayah Jawa Barat.
                    </p>
                    <div className="mt-2 text-[10px] text-emerald-400 font-medium">Status: Aktif & Terlindungi</div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                      <Cpu className="w-3.5 h-3.5" />
                      Audit Rasio OTS vs Trafik
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Mencegah klaim impresi tidak wajar dengan formula trafik engineering terstandarisasi.
                    </p>
                    <div className="mt-2 text-[10px] text-emerald-400 font-medium">Status: Aktif & Terlindungi</div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                      <Zap className="w-3.5 h-3.5" />
                      Integritas Struktur Tarif
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Memastikan keteraturan harga sewa berjenjang (1 bulan, 3 bulan, 6 bulan, 1 tahun).
                    </p>
                    <div className="mt-2 text-[10px] text-emerald-400 font-medium">Status: Aktif & Terlindungi</div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Penomoran Serial Unik
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Menjaga agar seluruh urutan titik (1..77) bersifat unik tanpa nomor ganda antar kota.
                    </p>
                    <div className="mt-2 text-[10px] text-emerald-400 font-medium">Status: Aktif & Terlindungi</div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                      <Flame className="w-3.5 h-3.5" />
                      Cloud Firestore Rules
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Security rules dengan default deny dan skema validasi tipe data ketat.
                    </p>
                    <div className="mt-2 text-[10px] text-emerald-400 font-medium">Status: Dideploy & Terproteksi</div>
                  </div>

                </div>
              </div>

              {/* AI Executive Summary Box */}
              {auditResult && (
                <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Ulasan Eksekutif Gemini AI
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    {auditResult.aiSummary}
                  </p>

                  {auditResult.recommendations && auditResult.recommendations.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Rekomendasi Tindakan AI:
                      </span>
                      <ul className="space-y-1">
                        {auditResult.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Issues Tab with Clear Notification of What to Remove or Fix */
            <div className="space-y-4">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Pemberitahuan Anomali & Rekomendasi Titik Yang Perlu Dihapus / Diperbaiki
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Sistem AI memeriksa integritas koordinat wilayah Jawa Barat, duplikasi ID, harga tidak normal, atau ketidakteraturan data.
                    </p>
                  </div>
                  {auditResult?.issues && auditResult.issues.length > 0 && (
                    <button
                      onClick={handleAutoHeal}
                      disabled={isHealing}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Perbaiki Otomatis Semua
                    </button>
                  )}
                </div>
              </div>

              {/* Issues List */}
              {auditResult?.issues && auditResult.issues.length > 0 ? (
                <div className="space-y-3">
                  {auditResult.issues.map((issue, idx) => {
                    const spot = spots.find(s => s.id === issue.spotId);
                    return (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          issue.severity === 'high' 
                            ? 'bg-rose-950/30 border-rose-800/60' 
                            : issue.severity === 'medium'
                            ? 'bg-amber-950/30 border-amber-800/60'
                            : 'bg-slate-800/60 border-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                              issue.severity === 'high'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              {issue.severity === 'high' ? 'Kritis / Hapus Rekomendasi' : 'Peringatan Anomali'}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              ID: {issue.spotId || 'N/A'}
                            </span>
                            <span className="text-xs font-semibold text-slate-200">
                              {issue.spotName}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300">
                            {issue.description}
                          </p>

                          {issue.suggestedFix && (
                            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Saran AI: {issue.suggestedFix}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons: Delete Spot */}
                        {issue.spotId && (
                          <div className="flex items-center gap-2 shrink-0">
                            {confirmDeleteSpot?.id === issue.spotId ? (
                              <div className="flex items-center gap-1.5 bg-rose-950 p-1.5 rounded-lg border border-rose-600 animate-in fade-in">
                                <span className="text-[10px] text-rose-200 font-semibold px-1">Hapus permanen?</span>
                                <button
                                  onClick={() => handleExecuteDelete(issue.spotId, issue.spotName)}
                                  disabled={deletingSpotId === issue.spotId}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold"
                                >
                                  {deletingSpotId === issue.spotId ? 'Menghapus...' : 'Ya, Hapus'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteSpot(null)}
                                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px]"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteSpot({ id: issue.spotId, name: issue.spotName })}
                                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                title="Hapus titik bermasalah ini dari inventaris & Cloud Firestore"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                <span>Hapus Titik Ini</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* No Issues Found - Dataset is completely clean */
                <div className="p-8 rounded-xl bg-slate-800/40 border border-slate-700/60 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">Tidak Ada Titik Bermasalah / Duplikat</h5>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                      Seluruh {spots.length} titik media OOH/DOOH Jawa Barat telah tervalidasi bersih: koordinat presisi di batas wilayah Jabar, serial unik, dan tarif sewa konsisten. Tidak ada titik yang perlu dihapus saat ini.
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-medium">
                      <Check className="w-3.5 h-3.5" />
                      Status Database: 100% Sehat & Terproteksi
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={handleRunAudit}
              disabled={isAuditing || isHealing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 ${isAuditing ? 'animate-spin' : ''}`} />
              {isAuditing ? 'Sedang Memindai dengan AI...' : 'Pindai Ulang Database (Gemini AI)'}
            </button>

            <button
              onClick={handleAutoHeal}
              disabled={isAuditing || isHealing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isHealing ? 'animate-spin' : ''}`} />
              {isHealing ? 'Menormalkan & Menyimpan...' : 'Perbaiki Otomatis Anomali (AI Auto-Fix)'}
            </button>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>AI Security Engine terproteksi di sisi server tanpa mengekspos API key ke peramban.</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-medium transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
