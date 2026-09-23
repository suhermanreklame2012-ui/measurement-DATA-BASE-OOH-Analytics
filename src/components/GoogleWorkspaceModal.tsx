import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  FileText, 
  HardDrive, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Plus, 
  Search, 
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Calendar,
  Layers,
  Clock,
  Folder,
  FolderOpen,
  Link,
  FileSpreadsheet,
  Table,
  Check,
  Users,
  Phone,
  Mail,
  MessageCircle,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Filter,
  Copy,
  ShieldAlert
} from 'lucide-react';
import { MediaSpot, ClientContact } from '../types/ooh';
import { getStoredClients } from '../services/clientService';
import { 
  syncGoogleContactsToApp, 
  getLastContactsSyncInfo,
  ContactsSyncResult 
} from '../services/googleContactsService';
import { 
  googleSignIn, 
  logout, 
  getCurrentUser, 
  getAccessToken,
  initAuth
} from '../services/googleAuthService';
import { 
  listDriveFiles, 
  listGoogleDocs, 
  listGoogleSheets,
  listDrivePhotos,
  uploadPhotoToDriveFolder,
  createOOHReportDocInDrive, 
  createOrSyncOOHSpreadsheet,
  fetchSpreadsheetDetails,
  fetchSpreadsheetValues,
  DriveFileItem,
  DrivePhotoItem,
  TARGET_DRIVE_FOLDER_ID,
  TARGET_DRIVE_FOLDER_URL,
  fetchTargetFolderMetadata,
  DriveFolderInfo,
  SpreadsheetInfo,
  SpreadsheetValuesResult
} from '../services/googleWorkspaceService';
import { addNotification, getStoredSpots, saveStoredSpots } from '../services/storageService';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: MediaSpot[];
  initialSubTab?: 'sheets' | 'docs' | 'drive' | 'photos' | 'contacts' | 'create';
  onSpotUpdated?: (spot: MediaSpot) => void;
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  isOpen,
  onClose,
  spots,
  initialSubTab = 'sheets',
  onSpotUpdated
}) => {
  const adminEmail = 'suherman.reklame2012@gmail.com';

  const [user, setUser] = useState<any>(getCurrentUser());
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'sheets' | 'docs' | 'drive' | 'photos' | 'contacts' | 'create'>(initialSubTab);

  // Photos state (Google Drive suherman.reklame2012@gmail.com)
  const [drivePhotos, setDrivePhotos] = useState<DrivePhotoItem[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState<boolean>(false);
  const [photosFolderOnly, setPhotosFolderOnly] = useState<boolean>(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoUploadSuccess, setPhotoUploadSuccess] = useState<string | null>(null);
  const [photoSearchQuery, setPhotoSearchQuery] = useState<string>('');
  const photoFileInputRef = React.useRef<HTMLInputElement>(null);

  // Contacts state
  const [clientsList, setClientsList] = useState<ClientContact[]>(getStoredClients());
  const [isSyncingContacts, setIsSyncingContacts] = useState<boolean>(false);
  const [contactsSyncMessage, setContactsSyncMessage] = useState<string | null>(null);
  const [lastContactsSyncInfo, setLastContactsSyncInfo] = useState(getLastContactsSyncInfo());

  // Sync initialSubTab when modal opens
  useEffect(() => {
    if (isOpen && initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [isOpen, initialSubTab]);

  // Files data
  const [folderInfo, setFolderInfo] = useState<DriveFolderInfo | null>(null);
  const [sheetsList, setSheetsList] = useState<DriveFileItem[]>([]);
  const [docsList, setDocsList] = useState<DriveFileItem[]>([]);
  const [driveList, setDriveList] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);

  // Sheet preview state
  const [selectedSheetItem, setSelectedSheetItem] = useState<DriveFileItem | null>(null);
  const [selectedSheetDetails, setSelectedSheetDetails] = useState<SpreadsheetInfo | null>(null);
  const [sheetValuesPreview, setSheetValuesPreview] = useState<SpreadsheetValuesResult | null>(null);
  const [isLoadingSheetPreview, setIsLoadingSheetPreview] = useState<boolean>(false);

  // New Sheet generation state
  const [newSheetTitle, setNewSheetTitle] = useState<string>(
    `Database Inventaris Media Reklame Jabar - ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
  );
  const [isSyncingSheet, setIsSyncingSheet] = useState<boolean>(false);
  const [syncSheetSuccess, setSyncSheetSuccess] = useState<DriveFileItem | null>(null);

  // New Doc generation state
  const [newDocTitle, setNewDocTitle] = useState<string>(
    `Laporan Penawaran Media OOH & DOOH Bandung - ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
  );
  const [isCreatingDoc, setIsCreatingDoc] = useState<boolean>(false);
  const [createdDocSuccess, setCreatedDocSuccess] = useState<DriveFileItem | null>(null);

  // Create Mode state (whether user is creating a Sheet or a Doc)
  const [createMode, setCreateMode] = useState<'sheet' | 'doc'>('sheet');

  // User confirmation modal state for mutating operations (Strict adherence to Skill guidelines)
  const [pendingConfirmAction, setPendingConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  // Initialize Auth state listener
  useEffect(() => {
    initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        // Not authenticated
      }
    );
  }, []);

  // Fetch files when token is available or tab changes
  useEffect(() => {
    if (isOpen && token) {
      fetchWorkspaceData(token);
    }
  }, [isOpen, token, activeSubTab]);

  const fetchWorkspaceData = async (currentToken: string) => {
    setIsLoadingFiles(true);
    setErrorMessage(null);
    try {
      // Fetch target folder metadata
      fetchTargetFolderMetadata(currentToken).then((info) => {
        if (info) setFolderInfo(info);
      });

      if (activeSubTab === 'sheets') {
        const sheets = await listGoogleSheets(currentToken);
        setSheetsList(sheets);
      } else if (activeSubTab === 'docs') {
        const docs = await listGoogleDocs(currentToken);
        setDocsList(docs);
      } else if (activeSubTab === 'drive') {
        const files = await listDriveFiles(currentToken);
        setDriveList(files);
      } else if (activeSubTab === 'photos') {
        setIsLoadingPhotos(true);
        try {
          const photos = await listDrivePhotos(currentToken, { folderOnly: photosFolderOnly });
          setDrivePhotos(photos);
        } finally {
          setIsLoadingPhotos(false);
        }
      }
    } catch (err: any) {
      console.error('Workspace fetch error:', err);
      setErrorMessage(
        err.message || 'Gagal menyinkronkan data Google Drive & Google Sheets dari folder target.'
      );
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleLoadDrivePhotos = async (onlyFolder: boolean = photosFolderOnly) => {
    let currentToken = token;
    if (!currentToken) {
      const auth = await googleSignIn();
      if (!auth?.accessToken) return;
      currentToken = auth.accessToken;
      setUser(auth.user);
      setToken(currentToken);
    }
    setIsLoadingPhotos(true);
    setErrorMessage(null);
    try {
      const photos = await listDrivePhotos(currentToken, { folderOnly: onlyFolder });
      setDrivePhotos(photos);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal memuat daftar foto dari Google Drive.');
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const handleUploadPhoto = async (file: File) => {
    let currentToken = token;
    if (!currentToken) {
      const auth = await googleSignIn();
      if (!auth?.accessToken) return;
      currentToken = auth.accessToken;
      setUser(auth.user);
      setToken(currentToken);
    }
    setIsUploadingPhoto(true);
    setPhotoUploadSuccess(null);
    setErrorMessage(null);
    try {
      const uploaded = await uploadPhotoToDriveFolder(currentToken, file, TARGET_DRIVE_FOLDER_ID);
      setDrivePhotos(prev => [uploaded, ...prev]);
      setPhotoUploadSuccess(`Foto "${file.name}" berhasil diunggah ke folder Google Drive!`);
      addNotification({
        title: 'Foto OOH Diunggah ke Drive',
        message: `Foto ${file.name} telah tersimpan di folder Google Drive (suherman.reklame2012@gmail.com).`,
        type: 'sync'
      });
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMessage(err.message || 'Gagal mengunggah foto ke Google Drive.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAssignPhotoToSpot = (photoUrl: string, spotId: string) => {
    const allStored = getStoredSpots();
    const updated = allStored.map(s => {
      if (s.id === spotId) {
        return {
          ...s,
          imageUrl: photoUrl,
          imageUrls: [photoUrl, ...(s.imageUrls || []).filter(u => u !== photoUrl)]
        };
      }
      return s;
    });
    saveStoredSpots(updated);
    addNotification({
      title: 'Foto Lokasi Ditugaskan',
      message: `Foto dari Google Drive berhasil dipasangkan ke titik ${spotId}.`,
      type: 'update'
    });
    if (onSpotUpdated) {
      const found = updated.find(s => s.id === spotId);
      if (found) onSpotUpdated(found);
    }
    alert(`Foto dari Google Drive berhasil dipasangkan ke titik ${spotId}!`);
  };

  const handleAutoMatchPhotos = () => {
    if (drivePhotos.length === 0 || spots.length === 0) return;
    const assignments: Array<{ spotId: string; photoUrl: string }> = [];
    const allStored = getStoredSpots();

    for (const spot of allStored) {
      const spotNameLower = spot.name.toLowerCase();
      const spotRoadLower = (spot.roadName || '').toLowerCase();
      const spotIdLower = spot.id.toLowerCase();

      const matchedPhoto = drivePhotos.find(p => {
        const pNameLower = p.name.toLowerCase();
        return (
          pNameLower.includes(spotIdLower) ||
          (spot.district && pNameLower.includes(spot.district.toLowerCase())) ||
          (spotRoadLower.length > 5 && pNameLower.includes(spotRoadLower.replace('jl.', '').trim())) ||
          (spotNameLower.length > 5 && pNameLower.includes(spotNameLower.slice(0, 15).trim()))
        );
      });

      if (matchedPhoto) {
        assignments.push({ spotId: spot.id, photoUrl: matchedPhoto.previewUrl });
      }
    }

    if (assignments.length === 0) {
      alert('Tidak ditemukan kesamaan nama file foto dengan nama jalan atau ID titik reklame. Anda dapat memasangkan foto secara manual dengan memilih titik pada foto yang diinginkan.');
      return;
    }

    const map = new Map(assignments.map(a => [a.spotId, a.photoUrl]));
    const nextSpots = allStored.map(s => {
      if (map.has(s.id)) {
        const photoUrl = map.get(s.id)!;
        return {
          ...s,
          imageUrl: photoUrl,
          imageUrls: [photoUrl, ...(s.imageUrls || []).filter(u => u !== photoUrl)]
        };
      }
      return s;
    });
    saveStoredSpots(nextSpots);
    addNotification({
      title: 'Auto-Match Foto Selesai',
      message: `${assignments.length} titik reklame berhasil dipasangkan foto dari Google Drive.`,
      type: 'sync',
      itemCount: assignments.length
    });
    alert(`Berhasil memasangkan foto Google Drive ke ${assignments.length} titik reklame secara otomatis!`);
  };

  const handleSyncContactsFromModal = async () => {
    let currentToken = token;
    if (!currentToken) {
      const authRes = await googleSignIn();
      if (!authRes?.accessToken) return;
      currentToken = authRes.accessToken;
      setUser(authRes.user);
      setToken(currentToken);
    }
    setIsSyncingContacts(true);
    setContactsSyncMessage(null);
    try {
      const res = await syncGoogleContactsToApp(currentToken);
      setClientsList(res.contacts);
      setLastContactsSyncInfo({
        timestamp: res.syncedAt,
        totalSynced: res.totalGoogleFetched
      });
      setContactsSyncMessage(
        `Berhasil menyinkronkan ${res.totalGoogleFetched} kontak dari suherman.reklame2012@gmail.com (${res.newCount} baru, ${res.updatedCount} diperbarui)!`
      );
    } catch (err: any) {
      console.error('Error syncing Google Contacts:', err);
      setErrorMessage(err.message || 'Gagal menyinkronkan buku kontak Google.');
    } finally {
      setIsSyncingContacts(false);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);

        addNotification({
          title: 'Google Workspace Terhubung',
          message: `Berhasil menghubungkan Google Sheets, Drive & Docs dengan akun ${result.user.email || adminEmail}.`,
          type: 'sync'
        });

        // Automatically fetch data upon sign in
        fetchWorkspaceData(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal masuk ke akun Google. Silakan coba kembali.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setSheetsList([]);
    setDocsList([]);
    setDriveList([]);
    setSelectedSheetItem(null);
    setSelectedSheetDetails(null);
    setSheetValuesPreview(null);
  };

  // Preview cells in a Google Sheet
  const handlePreviewSheet = async (item: DriveFileItem) => {
    if (!token) return;
    setSelectedSheetItem(item);
    setIsLoadingSheetPreview(true);
    try {
      const details = await fetchSpreadsheetDetails(token, item.id);
      setSelectedSheetDetails(details);
      const tabName = details.sheets[0]?.title || 'Sheet1';
      const values = await fetchSpreadsheetValues(token, item.id, `'${tabName}'!A1:S25`);
      setSheetValuesPreview(values);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal memuat isi sel spreadsheet dari Google Sheets.');
    } finally {
      setIsLoadingSheetPreview(false);
    }
  };

  // Request user confirmation before syncing/creating spreadsheet (Strict adherence to Skill guidelines)
  const triggerSyncSpreadsheet = (customTitle?: string, existingId?: string) => {
    if (!token) return;
    const titleToUse = (customTitle || newSheetTitle).trim();

    setPendingConfirmAction({
      title: existingId ? 'Konfirmasi Sinkronisasi Google Sheets' : 'Konfirmasi Buat & Sinkronkan Google Sheet',
      description: `Apakah Anda yakin ingin menyinkronkan data ${spots.length} titik media OOH & DOOH Jawa Barat ke Google Sheets pada akun admin (${user?.email || adminEmail}) di dalam folder target (ID: ${TARGET_DRIVE_FOLDER_ID})? Seluruh nama titik, ukuran, tarif sewa, trafik harian, impresi, dan koordinat Google Maps akan ditulis otomatis dengan format rapi.`,
      onConfirm: async () => {
        setPendingConfirmAction(null);
        setIsSyncingSheet(true);
        setErrorMessage(null);
        try {
          const synced = await createOrSyncOOHSpreadsheet(
            token,
            titleToUse,
            spots,
            user?.email || adminEmail,
            existingId
          );
          setSyncSheetSuccess(synced);

          addNotification({
            title: 'Google Sheets Berhasil Disinkronkan',
            message: `Spreadsheet "${synced.name}" (${spots.length} titik media) telah tersimpan di akun ${user?.email || adminEmail}.`,
            type: 'sync',
            itemCount: spots.length
          });

          // Refresh sheets list
          const updatedSheets = await listGoogleSheets(token);
          setSheetsList(updatedSheets);

          // If previewing this sheet, refresh preview
          if (selectedSheetItem?.id === synced.id || existingId) {
            handlePreviewSheet(synced);
          }
        } catch (err: any) {
          console.error(err);
          setErrorMessage(err.message || 'Gagal menyinkronkan spreadsheet ke Google Sheets.');
        } finally {
          setIsSyncingSheet(false);
        }
      }
    });
  };

  // Request user confirmation before creating document (Strict adherence to Skill guidelines)
  const triggerCreateDocument = () => {
    if (!token) return;

    setPendingConfirmAction({
      title: 'Konfirmasi Simpan Dokumen ke Folder Google Drive',
      description: `Apakah Anda yakin ingin membuat Google Doc baru berjudul "${newDocTitle}" dan menyimpannya langsung ke dalam folder khusus Google Drive (ID: ${TARGET_DRIVE_FOLDER_ID}) pada akun ${user?.email || adminEmail}? Dokumen ini memuat ringkasan data inventaris ${spots.length} titik media OOH & DOOH Jawa Barat.`,
      onConfirm: async () => {
        setPendingConfirmAction(null);
        setIsCreatingDoc(true);
        setErrorMessage(null);
        try {
          const newDoc = await createOOHReportDocInDrive(
            token,
            newDocTitle,
            spots,
            user?.email || adminEmail
          );
          setCreatedDocSuccess(newDoc);

          addNotification({
            title: 'Google Doc Berhasil Disimpan ke Folder',
            message: `Dokumen "${newDoc.name}" telah disimpan langsung ke folder Google Drive khusus Anda.`,
            type: 'create'
          });

          // Refresh docs list
          const docs = await listGoogleDocs(token);
          setDocsList(docs);
        } catch (err: any) {
          console.error(err);
          setErrorMessage(err.message || 'Gagal membuat dokumen di Google Docs.');
        } finally {
          setIsCreatingDoc(false);
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Google Workspace (Sheets, Docs & Drive)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Data Tersinkron
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tersinkron langsung ke akun <strong className="text-emerald-300">{adminEmail}</strong> di folder target khusus
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth / Account Status Bar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {user && token ? (
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="text-slate-500">Terhubung sebagai: </span>
                <strong className="text-slate-900 font-semibold">{user.email || adminEmail}</strong>
                {user.displayName && <span className="text-slate-500 ml-1">({user.displayName})</span>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-600">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Masuk dengan akun Google admin untuk mengaktifkan sinkronisasi otomatis Google Drive & Docs.</span>
            </div>
          )}

          <div className="flex items-center gap-2 flex-shrink-0">
            {user && token ? (
              <>
                <button
                  onClick={() => fetchWorkspaceData(token)}
                  disabled={isLoadingFiles}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs transition-colors shadow-2xs disabled:opacity-50"
                  title="Segarkan data dari Google Drive sekarang"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  Sinkronkan Sekarang
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition-colors"
                  title="Keluar dari sesi Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Ganti Akun
                </button>
              </>
            ) : (
              /* Official Styled Sign in with Google Button */
              <button
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-lg text-xs border border-slate-300 shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                {isAuthenticating ? 'Menghubungkan...' : 'Sign in with Google'}
              </button>
            )}
          </div>
        </div>

        {/* Error Alert Bar with Diagnostic Guidance */}
        {errorMessage && (
          <div className="mx-6 mt-4">
            {errorMessage.toLowerCase().includes('unauthorized-domain') ? (
              <div
                id="diagnostic-unauthorized-domain"
                data-testid="diagnostic-unauthorized-domain"
                className="p-4 bg-amber-50/95 border border-amber-300 rounded-xl text-amber-950 shadow-sm animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-amber-950">
                          Domain Belum Diizinkan di Firebase (auth/unauthorized-domain)
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-200/90 text-amber-900 font-bold border border-amber-300">
                          Action Required
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        className="text-amber-600 hover:text-amber-900 p-1 rounded-md"
                        title="Tutup pesan"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-amber-900 leading-relaxed">
                      Google OAuth &amp; Firebase Authentication menolak proses login karena domain hosting saat ini:{' '}
                      <code className="font-mono font-bold text-slate-950 bg-white px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
                        {typeof window !== 'undefined' ? window.location.hostname : 'measurement-kohl.vercel.app'}
                      </code>{' '}
                      belum didaftarkan di daftar <strong>Authorized Domains</strong> project Firebase Anda.
                    </p>

                    {/* Step-by-Step Instructions */}
                    <div className="bg-white/90 p-3 rounded-lg border border-amber-200/90 space-y-2 text-xs">
                      <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                        <span>Langkah Perbaikan (1 Menit):</span>
                        <span className="text-[10px] text-slate-500 font-normal">Project ID: <strong className="font-mono text-slate-700">sewa-billlboard--1741057119832</strong></span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
                        <li>
                          Salin nama domain ini:{' '}
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                navigator.clipboard.writeText(window.location.hostname);
                                setCopiedDomain(true);
                                setTimeout(() => setCopiedDomain(false), 3000);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 ml-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-mono font-bold text-[11px] transition-colors cursor-pointer"
                            title="Klik untuk menyalin nama domain ke clipboard"
                          >
                            {copiedDomain ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300">Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-300" />
                                <span>Salin: {typeof window !== 'undefined' ? window.location.hostname : 'domain'}</span>
                              </>
                            )}
                          </button>
                        </li>
                        <li>
                          Buka <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong>.
                        </li>
                        <li>
                          Klik <strong>Add domain</strong>, tempelkan domain yang disalin (tambahkan juga domain Vercel <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">vercel.app</code> dan GitHub Pages jika digunakan misal <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">github.io</code>), lalu klik <strong>Save</strong>.
                        </li>
                        <li>
                          Setelah disimpan di Firebase, kembali ke halaman ini lalu klik tombol <strong>Coba Login Lagi</strong>.
                        </li>
                      </ol>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <a
                        href="https://console.firebase.google.com/project/sewa-billlboard--1741057119832/authentication/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Firebase Console (Authorized Domains)</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleSignIn}
                        disabled={isAuthenticating}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isAuthenticating ? 'animate-spin' : ''}`} />
                        <span>{isAuthenticating ? 'Menghubungkan...' : 'Coba Login Lagi'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer"
                      >
                        Tutup Pesan
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-400 hover:text-rose-600 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
          
          {!token ? (
            /* Unauthenticated Onboarding State */
            <div className="py-8 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  Hubungkan Google Drive & Google Docs
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Integrasikan inventaris media luar ruang dengan akun Google admin Anda (<span className="font-semibold text-slate-800">{adminEmail}</span>). Sistem dikonfigurasi untuk hanya mengelola berkas di dalam folder khusus berikut.
                </p>
              </div>

              {/* Designated Folder Box in Onboarding */}
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-left space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  <Folder className="w-3.5 h-3.5 text-blue-600" />
                  <span>Folder Target Terkunci:</span>
                </div>
                <div className="text-[11px] text-slate-600 truncate font-mono">
                  ID: {TARGET_DRIVE_FOLDER_ID}
                </div>
                <a
                  href={TARGET_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-blue-700 font-semibold hover:underline pt-0.5"
                >
                  <span>Buka Folder Pengelolaan di Google Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  {isAuthenticating ? 'Menghubungkan Akun...' : 'Masuk dengan Google (suherman.reklame2012)'}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  OAuth 2.0 Resmi
                </span>
                <span>•</span>
                <span>Khusus Folder Terpilih</span>
              </div>
            </div>
          ) : (
            /* Authenticated State with Sub-tabs */
            <div className="space-y-4">

              {/* Designated Target Folder Status Banner */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-slate-50 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5 sm:mt-0">
                    <Folder className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {folderInfo?.name || 'Folder Khusus Pengelolaan Media'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Terkunci ke Folder Ini Saja
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      ID: <span className="font-mono font-medium text-slate-700">{TARGET_DRIVE_FOLDER_ID}</span> • Semua dokumen & berkas hanya dikelola di sini
                    </p>
                  </div>
                </div>

                <a
                  href={TARGET_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 font-semibold rounded-lg text-xs border border-blue-200 shadow-2xs transition-colors self-start sm:self-auto flex-shrink-0"
                >
                  <span>Buka Folder di Google Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              
              {/* Sub-tab Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setActiveSubTab('sheets')}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      activeSubTab === 'sheets'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Google Sheets ({sheetsList.length})
                  </button>

                  <button
                    onClick={() => setActiveSubTab('docs')}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      activeSubTab === 'docs'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Google Docs ({docsList.length})
                  </button>

                  <button
                    onClick={() => setActiveSubTab('drive')}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      activeSubTab === 'drive'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    Semua Berkas ({driveList.length})
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('photos');
                      if (token) {
                        handleLoadDrivePhotos(photosFolderOnly);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      activeSubTab === 'photos'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-purple-700 bg-purple-50/60 hover:bg-purple-100/80 border border-purple-200/60'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Foto Lokasi Reklame ({drivePhotos.length})
                  </button>

                  <button
                    onClick={() => setActiveSubTab('contacts')}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      activeSubTab === 'contacts'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Google Contacts ({clientsList.filter((c) => c.id.startsWith('gc_')).length})
                  </button>

                  <button
                    onClick={() => {
                      setActiveSubTab('create');
                      setCreateMode('sheet');
                    }}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      activeSubTab === 'create'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Buat / Sinkronkan Baru
                  </button>
                </div>

                {activeSubTab !== 'create' && (
                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari file di folder..."
                      className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Sub-tab: Google Sheets List & Interactive Viewer */}
              {activeSubTab === 'sheets' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 bg-emerald-50/60 p-3 border border-emerald-200/70 rounded-xl">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>
                        Spreadsheet Google Sheets di folder target. Data tersinkron dengan akun <strong className="text-slate-900">{adminEmail}</strong>.
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setActiveSubTab('create');
                        setCreateMode('sheet');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors flex-shrink-0 self-start sm:self-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Sinkronkan Media ke Sheet Baru
                    </button>
                  </div>

                  {isLoadingFiles ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                      <p>Mengambil daftar Google Sheets dari folder target...</p>
                    </div>
                  ) : sheetsList.length === 0 ? (
                    <div className="p-8 border border-dashed border-emerald-200 rounded-xl text-center space-y-3 bg-emerald-50/30">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Belum Ada Google Sheet di Folder Khusus Ini</div>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                          Folder <strong className="text-slate-700 font-mono">16cxwHJQ3YUdMFjcS0nvcHXguSeS5EDxh</strong> belum memiliki file Google Sheets. Klik tombol di bawah untuk membuat dan menyinkronkan {spots.length} data titik reklame ke akun <strong className="text-slate-700">{adminEmail}</strong>.
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => triggerSyncSpreadsheet()}
                          disabled={isSyncingSheet}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buat & Sinkronkan {spots.length} Titik Media Sekarang</span>
                        </button>
                        <a
                          href={TARGET_DRIVE_FOLDER_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium rounded-lg text-xs transition-colors shadow-2xs"
                        >
                          <span>Buka Folder di Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        {sheetsList
                          .filter((s) => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                          .map((sheet) => {
                            const isSelected = selectedSheetItem?.id === sheet.id;
                            return (
                              <div
                                key={sheet.id}
                                className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                                  isSelected ? 'bg-emerald-50/40 border-l-4 border-l-emerald-600' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                                    <FileSpreadsheet className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 truncate text-xs flex items-center gap-2">
                                      <span>{sheet.name}</span>
                                      {isSelected && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-medium">
                                          Pratinjau Aktif
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                      <span>ID: {sheet.id.slice(0, 10)}...</span>
                                      <span>•</span>
                                      <span>Diperbarui: {new Date(sheet.modifiedTime).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                                  <button
                                    onClick={() => handlePreviewSheet(sheet)}
                                    disabled={isLoadingSheetPreview}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors"
                                    title="Lihat isi sel spreadsheet langsung"
                                  >
                                    <Table className="w-3.5 h-3.5 text-slate-600" />
                                    <span>{isSelected ? 'Muat Ulang Sel' : 'Pratinjau Sel'}</span>
                                  </button>

                                  <button
                                    onClick={() => triggerSyncSpreadsheet(sheet.name, sheet.id)}
                                    disabled={isSyncingSheet}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium rounded-lg text-xs transition-colors"
                                    title={`Perbarui spreadsheet ini dengan ${spots.length} titik reklame terkini`}
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                                    <span>Perbarui ({spots.length} Titik)</span>
                                  </button>

                                  <a
                                    href={sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs transition-colors"
                                  >
                                    <span>Buka di Sheets</span>
                                    <ExternalLink className="w-3 h-3 text-slate-500" />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Interactive Sheet Preview Table */}
                      {selectedSheetItem && (
                        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm animate-in fade-in duration-200">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <Table className="w-4 h-4 text-emerald-600" />
                              <span className="font-bold text-xs text-slate-900">
                                Pratinjau Sel: {selectedSheetItem.name}
                              </span>
                              {selectedSheetDetails?.sheets[0] && (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                                  Tab: {selectedSheetDetails.sheets[0].title}
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                setSelectedSheetItem(null);
                                setSheetValuesPreview(null);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded"
                            >
                              Tutup Pratinjau
                            </button>
                          </div>

                          {isLoadingSheetPreview ? (
                            <div className="py-8 text-center text-slate-400 space-y-2 text-xs">
                              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-600" />
                              <p>Membaca data sel Google Sheets...</p>
                            </div>
                          ) : sheetValuesPreview?.values && sheetValuesPreview.values.length > 0 ? (
                            <div className="overflow-x-auto max-h-72 border border-slate-200 rounded-lg">
                              <table className="min-w-full divide-y divide-slate-200 text-[11px] text-left">
                                <thead className="bg-emerald-800 text-white sticky top-0 z-10 shadow-xs">
                                  <tr>
                                    {sheetValuesPreview.values[0].map((cell: any, cIdx: number) => (
                                      <th
                                        key={cIdx}
                                        className="px-3 py-2 font-bold whitespace-nowrap border-r border-emerald-700/50 last:border-0"
                                      >
                                        {cell || `Kolom ${cIdx + 1}`}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {sheetValuesPreview.values.slice(1).map((row: any[], rIdx: number) => (
                                    <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                                      {row.map((cell: any, cIdx: number) => (
                                        <td
                                          key={cIdx}
                                          className="px-3 py-1.5 whitespace-nowrap text-slate-700 border-r border-slate-100 last:border-0"
                                        >
                                          {typeof cell === 'string' && cell.startsWith('http') ? (
                                            <a
                                              href={cell}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                              <span>Tautan</span>
                                              <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                          ) : (
                                            cell || '-'
                                          )}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="py-6 text-center text-slate-400 text-xs">
                              Belum ada nilai data baris pada range yang dibaca.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 2: Google Docs List */}
              {activeSubTab === 'docs' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Dokumen Google Docs di dalam folder khusus ini:</span>
                    <span className="text-[11px] text-blue-600 font-medium">Sinkronisasi Real-Time Folder</span>
                  </div>

                  {isLoadingFiles ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                      <p>Mengambil berkas Google Docs dari folder target...</p>
                    </div>
                  ) : docsList.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center space-y-3 bg-slate-50/50">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-blue-100/70 text-blue-600 flex items-center justify-center">
                        <Folder className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">Belum ada dokumen Google Docs di folder ini</div>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                          Folder <strong className="text-slate-700 font-mono">16cxwHJQ3YUdMFjcS0nvcHXguSeS5EDxh</strong> masih kosong atau belum berisi file Docs. Anda dapat membuat proposal inventaris OOH/DOOH langsung ke folder ini.
                        </p>
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => {
                            setActiveSubTab('create');
                            setCreateMode('doc');
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Buat Dokumen Sekarang</span>
                        </button>
                        <a
                          href={TARGET_DRIVE_FOLDER_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium rounded-lg text-xs transition-colors shadow-2xs"
                        >
                          <span>Buka Folder di Google Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      {docsList
                        .filter((d) => !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((doc) => (
                          <div
                            key={doc.id}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate text-xs">
                                  {doc.name}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>ID: {doc.id.slice(0, 10)}...</span>
                                  <span>•</span>
                                  <span>Diperbarui: {new Date(doc.modifiedTime).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <a
                                href={doc.webViewLink || `https://docs.google.com/document/d/${doc.id}/edit`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-xs transition-colors border border-blue-200"
                              >
                                <span>Buka di Google Docs</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 3: All Drive Files in Target Folder */}
              {activeSubTab === 'drive' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Semua berkas di dalam folder khusus ini:</span>
                  </div>

                  {isLoadingFiles ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                      <p>Mengambil berkas dari folder target...</p>
                    </div>
                  ) : driveList.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center space-y-3 bg-slate-50/50">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center">
                        <HardDrive className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">Belum ada berkas di dalam folder ini</div>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                          Anda dapat mengunggah spreadsheet, materi gambar OOH, atau dokumen kontrak ke folder ini langsung melalui Google Drive.
                        </p>
                      </div>

                      <div className="pt-1">
                        <a
                          href={TARGET_DRIVE_FOLDER_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs transition-colors shadow-xs"
                        >
                          <span>Buka Folder di Google Drive untuk Unggah</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      {driveList
                        .filter((f) => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((file) => (
                          <div
                            key={file.id}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                                {file.mimeType.includes('spreadsheet') ? (
                                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                ) : file.mimeType.includes('document') ? (
                                  <FileText className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <HardDrive className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate text-xs">
                                  {file.name}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span className="truncate max-w-[200px]">{file.mimeType.split('.').pop()}</span>
                                  <span>•</span>
                                  <span>{new Date(file.modifiedTime).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                                </div>
                              </div>
                            </div>

                            <a
                              href={file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors"
                            >
                              <span>Buka File</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab: Foto & Galeri Lokasi Google Drive (suherman.reklame2012@gmail.com) */}
              {activeSubTab === 'photos' && (
                <div className="space-y-4">
                  {/* Photo Management Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50/60 to-slate-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm">
                            Foto Lokasi Reklame dari Google Drive
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                            suherman.reklame2012@gmail.com
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          Foto fisik titik baliho, billboard, dan bando jalanan yang tersimpan di Google Drive resmi admin dimuat secara otomatis untuk disertakan ke lampiran PDF penawaran klien.
                        </p>
                        <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                          <span>
                            {drivePhotos.length} foto tersedia di akun Google Drive admin
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                      <input
                        type="file"
                        ref={photoFileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadPhoto(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => photoFileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
                        title="Unggah foto baru langsung ke folder Google Drive"
                      >
                        {isUploadingPhoto ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Mengunggah...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Unggah Foto ke Drive</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleAutoMatchPhotos}
                        disabled={drivePhotos.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                        title="Otomatis pasangkan foto ke titik reklame yang sesuai berdasarkan nama jalan atau kode titik"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Auto-Match ke Titik</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadDrivePhotos(photosFolderOnly)}
                        disabled={isLoadingPhotos}
                        className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                        title="Muat ulang foto dari Google Drive"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPhotos ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {photoUploadSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        {photoUploadSuccess}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPhotoUploadSuccess(null)}
                        className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
                      >
                        Tutup
                      </button>
                    </div>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari foto berdasarkan nama..."
                        value={photoSearchQuery}
                        onChange={(e) => setPhotoSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
                      <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={photosFolderOnly}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setPhotosFolderOnly(val);
                            handleLoadDrivePhotos(val);
                          }}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                        />
                        <span className="font-medium text-slate-700">Hanya Folder Target ({TARGET_DRIVE_FOLDER_ID.slice(0, 8)}...)</span>
                      </label>
                    </div>
                  </div>

                  {/* Photos Grid */}
                  {isLoadingPhotos ? (
                    <div className="py-16 text-center text-slate-400 space-y-2">
                      <RefreshCw className="w-7 h-7 animate-spin mx-auto text-purple-600" />
                      <p className="text-xs">Mengambil foto-foto lokasi dari akun Google Drive suherman.reklame2012@gmail.com...</p>
                    </div>
                  ) : drivePhotos.length === 0 ? (
                    <div className="p-10 border border-dashed border-purple-200 rounded-2xl text-center space-y-3 bg-purple-50/20">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">Belum Ada Foto Lokasi di Google Drive Folder Ini</div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                        Folder target Google Drive Anda belum memiliki file foto atau gambar. Silakan unggah foto papan reklame Anda langsung ke Google Drive melalui tombol di atas atau seret foto ke folder Anda.
                      </p>
                      <button
                        type="button"
                        onClick={() => photoFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah Foto Sekarang</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
                      {drivePhotos
                        .filter((p) => !photoSearchQuery || p.name.toLowerCase().includes(photoSearchQuery.toLowerCase()))
                        .map((photo) => (
                          <div
                            key={photo.id}
                            className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-purple-400 hover:shadow-md transition-all flex flex-col group"
                          >
                            <div className="relative aspect-video bg-slate-950 overflow-hidden">
                              <img
                                src={photo.thumbnailUrl || photo.previewUrl}
                                alt={photo.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = photo.previewUrl;
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <a
                                  href={photo.webViewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-white hover:underline flex items-center gap-1"
                                >
                                  <span>Buka di Drive</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            </div>

                            <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                              <div>
                                <div className="text-xs font-semibold text-slate-900 truncate" title={photo.name}>
                                  {photo.name}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                                  <span>{photo.size ? `${(photo.size / (1024 * 1024)).toFixed(1)} MB` : 'Foto'}</span>
                                  <span>{photo.createdTime ? new Date(photo.createdTime).toLocaleDateString('id-ID') : ''}</span>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100">
                                <label className="text-[9px] font-bold text-slate-500 block mb-1">
                                  Pasang ke Titik Reklame:
                                </label>
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAssignPhotoToSpot(photo.previewUrl, e.target.value);
                                    }
                                  }}
                                  defaultValue=""
                                  className="w-full text-[10px] px-1.5 py-1 bg-slate-50 border border-slate-200 rounded text-slate-700 focus:ring-1 focus:ring-purple-500 cursor-pointer"
                                >
                                  <option value="" disabled>Pilih Titik Reklame...</option>
                                  {spots.map((spot) => (
                                    <option key={spot.id} value={spot.id}>
                                      {spot.id} - {spot.name.slice(0, 24)}...
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab: Google Contacts (Buku Alamat) */}
              {activeSubTab === 'contacts' && (
                <div className="space-y-4">
                  {/* Google Contacts Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50/60 to-slate-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm">
                            Sinkronisasi Google Contacts (People API)
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            {adminEmail}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          Buku alamat kontak dari akun Gmail <strong className="text-slate-800 font-medium">{adminEmail}</strong> disinkronkan secara otomatis ke database klien OOH Media untuk penawaran WhatsApp Web dan Email.
                        </p>
                        <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>
                            {lastContactsSyncInfo
                              ? `Terakhir disinkronkan: ${new Date(lastContactsSyncInfo.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} • ${clientsList.filter((c) => c.id.startsWith('gc_')).length} kontak Google tersimpan`
                              : 'Belum pernah disinkronkan. Klik tombol di kanan untuk mulai sinkronisasi.'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <a
                        href="https://contacts.google.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs border border-slate-200 shadow-2xs transition-colors"
                        title="Buka Google Contacts di tab baru"
                      >
                        <span>contacts.google.com</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                      <button
                        onClick={handleSyncContactsFromModal}
                        disabled={isSyncingContacts}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingContacts ? 'animate-spin' : ''}`} />
                        <span>{isSyncingContacts ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                      </button>
                    </div>
                  </div>

                  {contactsSyncMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{contactsSyncMessage}</span>
                    </div>
                  )}

                  {/* Summary & Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-bold text-slate-800">
                        Total {clientsList.length} Kontak Terdaftar
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-blue-700 font-medium">
                        {clientsList.filter((c) => c.id.startsWith('gc_')).length} Google Contacts
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600 font-medium">
                        {clientsList.filter((c) => !c.id.startsWith('gc_')).length} Kontak Klien Internal
                      </span>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama, perusahaan, telepon..."
                        className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Contacts List Grid */}
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs max-h-[420px] overflow-y-auto">
                    {clientsList
                      .filter((c) => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          c.name.toLowerCase().includes(q) ||
                          c.company.toLowerCase().includes(q) ||
                          (c.role && c.role.toLowerCase().includes(q)) ||
                          (c.email && c.email.toLowerCase().includes(q)) ||
                          (c.phone && c.phone.includes(q)) ||
                          (c.category && c.category.toLowerCase().includes(q))
                        );
                      })
                      .map((c) => (
                        <div
                          key={c.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">{c.company}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {c.category}
                              </span>
                              {c.id.startsWith('gc_') ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold flex items-center gap-1">
                                  <Users className="w-3 h-3 text-blue-600" />
                                  Google Contacts
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  Lokal
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-700 mt-1 font-medium">
                              {c.name} {c.role ? `• ${c.role}` : ''}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-3 font-mono">
                              {c.phone && <span>📞 {c.phone}</span>}
                              {c.email && <span>✉️ {c.email}</span>}
                              <span>📨 {c.proposalsSentCount || 0}x penawaran terkirim</span>
                            </div>
                            {c.notes && (
                              <div className="text-[10px] text-slate-500 mt-1 italic bg-slate-50 p-1.5 rounded border border-slate-100 max-w-xl">
                                "{c.notes}"
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {c.phone && (
                              <button
                                type="button"
                                onClick={() => {
                                  const cleanNum = c.phone.replace(/[^0-9]/g, '');
                                  const waNum = cleanNum.startsWith('0') ? '62' + cleanNum.substring(1) : cleanNum;
                                  window.open(`https://web.whatsapp.com/send?phone=${waNum}`, '_blank');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                                title="Buka percakapan di WhatsApp Web"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                                <span>WhatsApp Web</span>
                              </button>
                            )}

                            {c.email && (
                              <a
                                href={`mailto:${c.email}?subject=Penawaran%20Media%20OOH%20Bandung`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                                title="Kirim email ke klien"
                              >
                                <Mail className="w-3.5 h-3.5 text-blue-600" />
                                <span>Email</span>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}

                    {clientsList.length === 0 && (
                      <div className="p-8 text-center text-slate-500 space-y-2">
                        <Users className="w-8 h-8 mx-auto text-slate-400" />
                        <div className="font-semibold text-xs text-slate-700">Belum ada kontak yang disinkronkan</div>
                        <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                          Klik tombol "Sinkronkan Sekarang" di atas untuk menghubungkan buku alamat Google Contacts dari {adminEmail}.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-tab 4: Create & Sync New Sheets / Docs */}
              {activeSubTab === 'create' && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  {/* Format Selector: Sheets vs Docs */}
                  <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-xl">
                    <button
                      onClick={() => setCreateMode('sheet')}
                      className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                        createMode === 'sheet'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Google Sheets (Database 19 Kolom)
                    </button>
                    <button
                      onClick={() => setCreateMode('doc')}
                      className={`flex-1 py-2 px-3 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
                        createMode === 'doc'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Google Docs (Proposal Eksekutif)
                    </button>
                  </div>

                  {/* Mode: Google Sheets */}
                  {createMode === 'sheet' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          Sinkronkan Seluruh Titik Reklame ke Google Sheets Baru
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Spreadsheet baru otomatis dibuat di folder khusus <strong className="text-slate-800 font-mono">16cxwHJQ3YUdMFjcS0nvcHXguSeS5EDxh</strong> pada akun <strong className="text-slate-800">{user?.email || adminEmail}</strong>.
                        </p>
                      </div>

                      {syncSheetSuccess && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <div>
                              <span className="font-bold text-xs">Spreadsheet Berhasil Dibuat: </span>
                              <span className="text-xs">{syncSheetSuccess.name}</span>
                            </div>
                          </div>
                          <a
                            href={syncSheetSuccess.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white font-semibold rounded-md text-xs hover:bg-emerald-700"
                          >
                            Buka di Google Sheets
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="font-semibold text-slate-800 text-xs block">
                          Judul Spreadsheet Google Sheets:
                        </label>
                        <input
                          type="text"
                          value={newSheetTitle}
                          onChange={(e) => setNewSheetTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 text-[11px] text-slate-600">
                        <div className="font-semibold text-slate-800 flex items-center justify-between">
                          <span>19 Kolom Terstruktur yang Disinkronkan:</span>
                          <span className="text-emerald-600 font-semibold">{spots.length} Baris Media</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[10px] text-slate-500">
                          <div>1. No</div>
                          <div>2. ID Titik</div>
                          <div>3. Nama Media / Lokasi</div>
                          <div>4. Tipe Media (Billboard/Videotron)</div>
                          <div>5. Kota / Kabupaten</div>
                          <div>6. Kecamatan</div>
                          <div>7. Alamat Lengkap</div>
                          <div>8. Ukuran (P x L)</div>
                          <div>9. Orientasi Media</div>
                          <div>10. Penerangan</div>
                          <div>11. Trafik Harian (Kend/Hari)</div>
                          <div>12. Impresi OTS Harian</div>
                          <div>13. Tarif Sewa / Bulan</div>
                          <div>14. Tarif Sewa / Tahun</div>
                          <div>15. Status Ketersediaan</div>
                          <div>16. Latitude</div>
                          <div>17. Longitude</div>
                          <div>18. Tautan Google Maps</div>
                          <div>19. Terakhir Diperbarui</div>
                        </div>
                        <div className="text-[10px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200 mt-2">
                          ✓ Otomatis memformat baris judul dengan latar hijau emerald tua & teks tebal, serta membekukan baris 1 (Freeze row).
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => triggerSyncSpreadsheet()}
                          disabled={isSyncingSheet || !newSheetTitle.trim()}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isSyncingSheet ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Menyinkronkan ke Google Sheets...
                            </>
                          ) : (
                            <>
                              <FileSpreadsheet className="w-4 h-4" />
                              Sinkronkan ke Google Sheets ({adminEmail})
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode: Google Docs */}
                  {createMode === 'doc' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          Buat & Simpan Laporan Dokumen Google Docs
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Dokumen baru akan otomatis disimpan di folder khusus <strong className="text-slate-800 font-mono">16cxwHJQ3YUdMFjcS0nvcHXguSeS5EDxh</strong> pada akun <strong className="text-slate-800">{user?.email || adminEmail}</strong>.
                        </p>
                      </div>

                      {createdDocSuccess && (
                        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <div>
                              <span className="font-bold text-xs">Dokumen Berhasil Dibuat: </span>
                              <span className="text-xs">{createdDocSuccess.name}</span>
                            </div>
                          </div>
                          <a
                            href={createdDocSuccess.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white font-semibold rounded-md text-xs hover:bg-blue-700"
                          >
                            Buka Dokumen
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="font-semibold text-slate-800 text-xs block">
                          Judul Dokumen Google Doc:
                        </label>
                        <input
                          type="text"
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-600">
                        <div className="font-semibold text-slate-800">Isi Otomatis yang Disertakan:</div>
                        <div>• Ringkasan eksekutif inventaris media OOH/DOOH Kota Bandung & Jawa Barat</div>
                        <div>• Akumulasi volume lalu lintas harian (~{spots.reduce((a, s) => a + s.dailyTraffic, 0).toLocaleString('id-ID')} kend./hari)</div>
                        <div>• Estimasi impresi OTS per titik & per koridor jalan</div>
                        <div>• Rincian tarif sewa 1 bulan, spesifikasi teknis reklame & LED Videotron</div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={triggerCreateDocument}
                          disabled={isCreatingDoc || !newDocTitle.trim()}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isCreatingDoc ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Memproses Dokumen ke Google Drive...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4" />
                              Simpan ke Google Drive ({adminEmail})
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Sistem Google Workspace API • Google Drive v3 & Docs v1
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg text-xs transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* Mandatory User Confirmation Dialog for mutating Google Workspace actions */}
      {pendingConfirmAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">
                {pendingConfirmAction.title}
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {pendingConfirmAction.description}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setPendingConfirmAction(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
              >
                Batal
              </button>
              <button
                onClick={pendingConfirmAction.onConfirm}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs"
              >
                Konfirmasi & Simpan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
