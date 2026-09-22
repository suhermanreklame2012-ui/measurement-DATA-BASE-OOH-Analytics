import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Search, 
  HardDrive, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  Upload, 
  Image as ImageIcon, 
  AlertCircle,
  FolderOpen,
  Filter,
  Sparkles,
  Check,
  Eye,
  Camera,
  Layers,
  ArrowRight
} from 'lucide-react';
import { MediaSpot } from '../types/ooh';
import { 
  listDrivePhotos, 
  uploadPhotoToDriveFolder, 
  DrivePhotoItem, 
  TARGET_DRIVE_FOLDER_ID, 
  TARGET_DRIVE_FOLDER_URL 
} from '../services/googleWorkspaceService';
import { 
  googleSignIn, 
  getCurrentUser, 
  getAccessToken, 
  initAuth 
} from '../services/googleAuthService';
import { addNotification } from '../services/storageService';

interface GoogleDrivePhotoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSpot?: MediaSpot | null;
  onSelectPhoto: (photoUrl: string, photoItem: DrivePhotoItem, spotId?: string) => void;
  allSpots?: MediaSpot[];
  onBatchSyncPhotos?: (assignments: Array<{ spotId: string; photoUrl: string }>) => void;
}

export const GoogleDrivePhotoPickerModal: React.FC<GoogleDrivePhotoPickerModalProps> = ({
  isOpen,
  onClose,
  targetSpot,
  onSelectPhoto,
  allSpots = [],
  onBatchSyncPhotos
}) => {
  const adminEmail = 'suherman.reklame2012@gmail.com';

  const [user, setUser] = useState<any>(getCurrentUser());
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Photos state
  const [photos, setPhotos] = useState<DrivePhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [folderOnly, setFolderOnly] = useState<boolean>(true);
  const [selectedPhoto, setSelectedPhoto] = useState<DrivePhotoItem | null>(null);

  // Uploading state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected target spot if dropdown is used
  const [activeSpot, setActiveSpot] = useState<MediaSpot | null>(targetSpot || null);

  useEffect(() => {
    setActiveSpot(targetSpot || null);
  }, [targetSpot]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        // Not authenticated
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch photos on open or token change
  useEffect(() => {
    if (isOpen) {
      if (token) {
        fetchPhotos(token, folderOnly, searchQuery);
      } else {
        // Try getting cached token
        getAccessToken().then((cached) => {
          if (cached) {
            setToken(cached);
            fetchPhotos(cached, folderOnly, searchQuery);
          }
        });
      }
    }
  }, [isOpen, token, folderOnly]);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setUser(res.user);
        setToken(res.accessToken);
        fetchPhotos(res.accessToken, folderOnly, searchQuery);
        addNotification({
          title: 'Google Drive Terhubung',
          message: `Berhasil mengakses Google Drive akun ${res.user.email || adminEmail}.`,
          type: 'sync'
        });
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setAuthError(err.message || 'Gagal masuk ke akun Google Drive. Silakan coba kembali.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const fetchPhotos = async (currentToken: string, onlyFolder: boolean, search: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const items = await listDrivePhotos(currentToken, {
        folderOnly: onlyFolder,
        search: search.trim() ? search.trim() : undefined,
        pageSize: 60
      });
      setPhotos(items);
    } catch (err: any) {
      console.error('Error fetching Drive photos:', err);
      setAuthError(err.message || 'Gagal membaca berkas gambar dari Google Drive.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      fetchPhotos(token, folderOnly, searchQuery);
    }
  };

  const handleToggleFolderFilter = () => {
    const nextVal = !folderOnly;
    setFolderOnly(nextVal);
    if (token) {
      fetchPhotos(token, nextVal, searchQuery);
    }
  };

  const handleSelectPhoto = (photo: DrivePhotoItem) => {
    setSelectedPhoto(photo);
    onSelectPhoto(photo.directEmbedUrl, photo, activeSpot?.id);
    addNotification({
      title: 'Foto Google Drive Diterapkan',
      message: `Foto "${photo.name}" berhasil dipasang ke titik reklame ${activeSpot ? activeSpot.name : ''}.`,
      type: 'update'
    });
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token) return;

    const file = files[0];
    setIsUploading(true);
    setUploadSuccess(null);
    setAuthError(null);

    try {
      const uploaded = await uploadPhotoToDriveFolder(token, file, TARGET_DRIVE_FOLDER_ID);
      setPhotos(prev => [uploaded, ...prev]);
      setUploadSuccess(`Foto "${file.name}" berhasil diunggah ke Google Drive suherman.reklame2012@gmail.com!`);
      addNotification({
        title: 'Upload ke Google Drive Berhasil',
        message: `Foto "${file.name}" telah tersimpan di folder resmi Suherman Reklame.`,
        type: 'upload'
      });
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Upload to Drive failed:', err);
      setAuthError(err.message || 'Gagal mengunggah foto ke Google Drive.');
    } finally {
      setIsUploading(false);
    }
  };

  // Auto Match Photos by name (e.g. if Drive filename includes "Kiaracondong" or "Dipatiukur")
  const handleAutoMatch = () => {
    if (!onBatchSyncPhotos || allSpots.length === 0 || photos.length === 0) return;

    const assignments: Array<{ spotId: string; photoUrl: string }> = [];
    allSpots.forEach(spot => {
      const spotKeywords = [
        spot.name.toLowerCase(),
        spot.roadName.toLowerCase(),
        spot.id.toLowerCase()
      ];
      // Find matching photo in Drive
      const matched = photos.find(p => {
        const pName = p.name.toLowerCase();
        return spotKeywords.some(kw => {
          const parts = kw.split(' ').filter(w => w.length > 3);
          return parts.some(part => pName.includes(part));
        });
      });

      if (matched) {
        assignments.push({
          spotId: spot.id,
          photoUrl: matched.directEmbedUrl
        });
      }
    });

    if (assignments.length > 0) {
      onBatchSyncPhotos(assignments);
      addNotification({
        title: 'Sinkronisasi Otomatis Google Drive',
        message: `Berhasil menghubungkan ${assignments.length} foto Google Drive dengan titik reklame sesuai nama lokasi.`,
        type: 'sync'
      });
      onClose();
    } else {
      alert('Tidak ditemukan kesamaan nama otomatis antara berkas foto Google Drive dan nama titik inventaris. Anda dapat memilih foto secara manual.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Pilih Foto dari Google Drive
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {adminEmail}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pilih foto lapangan asli dari folder dokumentasi Google Drive untuk dimasukkan ke proposal & katalog
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Spot Context Bar */}
        <div className="px-6 py-2.5 bg-slate-800/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Target Pemasangan:</span>
            {allSpots.length > 0 ? (
              <select
                value={activeSpot?.id || ''}
                onChange={(e) => {
                  const found = allSpots.find(s => s.id === e.target.value);
                  setActiveSpot(found || null);
                }}
                className="bg-slate-900 border border-slate-700 text-emerald-400 font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
              >
                {allSpots.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.size} • {s.city})
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-semibold text-emerald-400">
                {activeSpot ? `${activeSpot.name} (${activeSpot.size})` : 'Proposal Eksekutif'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={TARGET_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-700 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Buka Folder di Drive Web</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {token && onBatchSyncPhotos && (
              <button
                type="button"
                onClick={handleAutoMatch}
                disabled={photos.length === 0}
                className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/60 px-2.5 py-1 rounded-md border border-emerald-800/60 transition-colors cursor-pointer disabled:opacity-40"
                title="Cocokkan foto Google Drive dengan nama titik inventaris secara otomatis"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Match Nama</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* If NOT Authenticated */}
          {!token ? (
            <div className="py-12 px-4 text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                <HardDrive className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">
                Hubungkan Google Drive
              </h4>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Masuk dengan akun <strong className="text-slate-200">{adminEmail}</strong> untuk mengakses seluruh album foto dokumentasi lapangan reklame.
              </p>

              {authError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSignIn}
                disabled={isAuthenticating}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-900/30 cursor-pointer disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menghubungkan Akun Google...</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-4 h-4" />
                    <span>Masuk dengan Google ({adminEmail})</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div>
              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari foto berdasarkan nama (contoh: Kiaracondong, Dipatiukur, Dago)..."
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-20 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    Cari
                  </button>
                </form>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleFolderFilter}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      folderOnly
                        ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title="Beralih antara folder resmi khusus atau seluruh gambar di Google Drive"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{folderOnly ? 'Folder Resmi Khusus' : 'Seluruh Google Drive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    title="Unggah foto baru langsung ke Google Drive suherman.reklame2012@gmail.com"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Unggah ke Drive</span>
                      </>
                    )}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fetchPhotos(token, folderOnly, searchQuery)}
                    disabled={isLoading}
                    className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                    title="Muat ulang daftar foto dari Google Drive"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
                  </button>
                </div>
              </div>

              {uploadSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{uploadSuccess}</span>
                  </div>
                  <button onClick={() => setUploadSuccess(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Photo Gallery Grid */}
              {isLoading ? (
                <div className="py-20 text-center">
                  <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-medium">
                    Mengambil galeri foto lapangan dari Google Drive...
                  </p>
                </div>
              ) : photos.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                  <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h5 className="text-sm font-bold text-slate-300 mb-1">
                    {searchQuery ? `Tidak ada foto dengan kata kunci "${searchQuery}"` : 'Belum Ada Foto Ditemukan di Folder Ini'}
                  </h5>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    {folderOnly 
                      ? 'Folder dokumentasi target belum memiliki berkas foto, atau Anda dapat mencoba mencari di seluruh Google Drive.'
                      : 'Pastikan akun suherman.reklame2012@gmail.com memiliki berkas gambar/foto lapangan.'}
                  </p>
                  <div className="flex justify-center gap-2">
                    {folderOnly && (
                      <button
                        type="button"
                        onClick={handleToggleFolderFilter}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200"
                      >
                        Cari di Seluruh Google Drive
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Foto Sekarang</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photos.map((item) => (
                    <div
                      key={item.id}
                      className="group bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl overflow-hidden transition-all duration-200 flex flex-col shadow-md"
                    >
                      {/* Image Thumbnail */}
                      <div className="relative aspect-video bg-slate-950 overflow-hidden">
                        <img
                          src={item.thumbnailLink || item.directEmbedUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to direct url
                            (e.currentTarget as HTMLImageElement).src = item.directEmbedUrl;
                          }}
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                          <a
                            href={item.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-black text-white text-[10px] inline-flex items-center gap-1"
                            title="Buka foto di Google Drive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview</span>
                          </a>
                        </div>
                      </div>

                      {/* Details & Actions */}
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div className="mb-2">
                          <h6 
                            className="text-xs font-semibold text-slate-200 line-clamp-2 title-ellipsis mb-1" 
                            title={item.name}
                          >
                            {item.name}
                          </h6>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>
                              {item.width && item.height ? `${item.width}x${item.height}` : 'Google Drive'}
                            </span>
                            <span>{new Date(item.modifiedTime).toLocaleDateString('id-ID')}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectPhoto(item)}
                          className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Pilih Foto Ini</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Folder ID: <code className="text-slate-300 font-mono text-[11px]">{TARGET_DRIVE_FOLDER_ID}</code></span>
          </div>

          <div>
            <span>Total Terdeteksi: <strong className="text-white">{photos.length}</strong> foto</span>
          </div>
        </div>
      </div>
    </div>
  );
};
