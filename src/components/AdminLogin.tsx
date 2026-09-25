import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Key, AlertCircle, RefreshCw, UserPlus, X, LogIn } from 'lucide-react';
import { loginWithEmail, resetPassword, registerAdmin } from '../services/emailAuthService';
import { signInWithGooglePopup } from '../services/firebase';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onClose?: () => void;
  reason?: string | null;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onClose, reason }) => {
  const [email, setEmail] = useState('suherman.reklame2012@gmail.com');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await loginWithEmail(email, password);
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      
      const errorCode = err.code || '';
      const errorMessage = err.message || '';
      
      if (errorCode === 'auth/operation-not-allowed' || errorMessage.includes('operation-not-allowed')) {
        setError('Akses ditolak. Anda BELUM mengaktifkan metode Login "Email/Password" di pengaturan Firebase Console (Build > Authentication > Sign-in method). Atau gunakan tombol Masuk dengan Google.');
      } else if (errorCode === 'auth/unauthorized-domain' || errorMessage.includes('unauthorized-domain')) {
        setError(`Domain ${typeof window !== 'undefined' ? window.location.hostname : 'hosting'} belum didaftarkan di Authorized Domains Firebase Authentication. Tambahkan domain ini di Firebase Console.`);
      } else if (
        errorCode === 'auth/invalid-credential' || 
        errorCode === 'auth/wrong-password' || 
        errorCode === 'auth/user-not-found' ||
        errorMessage.includes('invalid-credential') ||
        errorMessage.includes('wrong-password') ||
        errorMessage.includes('user-not-found')
      ) {
        setError('Akun tidak ditemukan atau password salah. Jika Anda belum mendaftar, silakan klik tombol "Daftarkan Akun Superadmin" di bawah atau gunakan Akun Google.');
      } else {
        setError(errorMessage || 'Gagal masuk. Silakan periksa koneksi Anda.');
      }
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await signInWithGooglePopup();
      onLoginSuccess();
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      const code = err.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Jendela popup Google ditutup sebelum proses selesai.');
      } else {
        setError('Gagal masuk via Google: ' + (err.message || 'Coba periksa koneksi atau izin popup.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      setError('Email dan password wajib diisi sebelum mendaftar.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await registerAdmin(email, password);
      setSuccessMsg('Akun berhasil didaftarkan! Sekarang Anda bisa langsung Masuk ke Dashboard.');
    } catch (err: any) {
      console.error(err);
      const regCode = err.code || '';
      const regMsg = err.message || '';

      if (regCode === 'auth/email-already-in-use' || regMsg.includes('email-already-in-use')) {
        setError('Akun ini sudah terdaftar. Silakan masukkan password yang benar dan klik "Masuk ke Dashboard".');
      } else if (regCode === 'auth/operation-not-allowed' || regMsg.includes('operation-not-allowed')) {
        setError('Pendaftaran ditolak. Anda BELUM mengaktifkan metode Login "Email/Password" di pengaturan Firebase Console.');
      } else {
        setError('Gagal mendaftar: ' + regMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Masukkan alamat email untuk reset password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal mengirim email reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
      {/* Close button if modal */}
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 z-20 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Tutup & Kembali ke Katalog Publik"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="p-6 sm:p-7 text-center bg-slate-900 text-white space-y-2 relative">
        <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl mx-auto flex items-center justify-center text-emerald-400 shadow-inner">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-wide">Portal Admin Reklame</h2>
          <p className="text-xs text-slate-400 mt-0.5">Otorisasi Kelola, Edit & Hapus Titik Media</p>
        </div>
      </div>

      <div className="p-6 sm:p-7">
        {/* If invoked due to attempting an edit action */}
        {reason && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Akses Terproteksi Admin</div>
              <div className="text-[11px] text-amber-800 mt-0.5">{reason}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Quick Google Sign In */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] disabled:opacity-70 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Masuk Cepat dengan Akun Google</span>
          </button>

          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">atau email password</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>
        </div>

        {resetSent && mode === 'reset' ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Tautan Reset Terkirim</h3>
              <p className="text-xs text-slate-500 mt-1">
                Kami telah mengirimkan tautan reset password ke email <strong>{email}</strong>. 
                Silakan periksa kotak masuk (atau folder spam) Anda.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setResetSent(false);
                setError(null);
              }}
              className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold transition-colors mt-2 block w-full"
            >
              Kembali ke Log In
            </button>
          </div>
        ) : (
          <form onSubmit={mode === 'login' ? handleLogin : handleResetPassword} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Admin</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="suherman.reklame2012@gmail.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-medium"
                />
              </div>
            </div>

            {mode === 'login' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password Admin</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all active:scale-[0.98] shadow-sm disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : mode === 'login' ? (
                  <Key className="w-4 h-4" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {isLoading ? 'Memproses...' : mode === 'login' ? 'Masuk sebagai Admin' : 'Kirim Link Reset'}
              </button>
            </div>

            {mode === 'login' && (
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-[0.98] shadow-2xs disabled:opacity-70 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-500" />
                  Daftarkan Akun Superadmin
                </button>
              </div>
            )}

            <div className="text-center pt-1.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'reset' : 'login');
                  setError(null);
                }}
                className="text-[11px] text-slate-500 hover:text-emerald-600 font-medium transition-colors"
              >
                {mode === 'login' ? 'Lupa password?' : 'Kembali log in'}
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-medium transition-colors"
                >
                  Batal / Mode Publik
                </button>
              )}
            </div>
          </form>
        )}

        <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 leading-relaxed text-center">
          Superadmin: <strong className="text-slate-700">suherman.Reklame2012@gmail.com</strong>. Pengunjung umum tetap dapat melihat dan menjelajahi semua data lokasi.
        </div>
      </div>
    </div>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white overflow-y-auto">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      {content}
    </div>
  );
};

