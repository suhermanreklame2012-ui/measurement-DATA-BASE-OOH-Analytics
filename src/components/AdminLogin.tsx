import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, Key, AlertCircle, RefreshCw, UserPlus } from 'lucide-react';
import { loginWithEmail, resetPassword, registerAdmin } from '../services/emailAuthService';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
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
      // Wait for auth listener in App.tsx to catch the state change
    } catch (err: any) {
      console.error(err);
      
      const errorCode = err.code || '';
      const errorMessage = err.message || '';
      
      if (errorCode === 'auth/operation-not-allowed' || errorMessage.includes('operation-not-allowed')) {
        setError('Akses ditolak. Anda BELUM mengaktifkan metode Login "Email/Password" di pengaturan Firebase Console (Build > Authentication > Sign-in method).');
      } else if (
        errorCode === 'auth/invalid-credential' || 
        errorCode === 'auth/wrong-password' || 
        errorCode === 'auth/user-not-found' ||
        errorMessage.includes('invalid-credential') ||
        errorMessage.includes('wrong-password') ||
        errorMessage.includes('user-not-found')
      ) {
        setError('Akun tidak ditemukan atau password salah. Jika Anda belum mendaftar, silakan klik tombol "Daftarkan Akun Superadmin" di bawah.');
      } else {
        setError(errorMessage || 'Gagal masuk. Silakan periksa koneksi Anda.');
      }
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
        setError('Pendaftaran ditolak. Anda BELUM mengaktifkan metode Login "Email/Password" di pengaturan Firebase Console (Tahap 1).');
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

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 text-center bg-slate-900 text-white space-y-3">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl mx-auto flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-wide">OOH Analytics Ops</h2>
            <p className="text-sm text-slate-400 mt-1">Superadmin Security Gateway</p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
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
            <form onSubmit={mode === 'login' ? handleLogin : handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Admin</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-500 cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              {mode === 'login' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password Rahasia</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all active:scale-[0.98] shadow-sm disabled:opacity-70"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : mode === 'login' ? (
                    <Key className="w-4 h-4" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {isLoading ? 'Memproses...' : mode === 'login' ? 'Masuk ke Dashboard' : 'Kirim Link Reset'}
                </button>
              </div>

              {mode === 'login' && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all active:scale-[0.98] shadow-sm disabled:opacity-70"
                  >
                    <UserPlus className="w-4 h-4" />
                    Daftarkan Akun Superadmin
                  </button>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'reset' : 'login');
                    setError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-emerald-600 font-medium transition-colors"
                >
                  {mode === 'login' ? 'Lupa password? Reset via email.' : 'Ingat password? Kembali log in.'}
                </button>
              </div>
            </form>
          )}

          {/* Infrastructure Setup Instruction if auth fails */}
          <div className="mt-8 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 leading-relaxed text-center">
            Penting: Demi keamanan tingkat tinggi, password default tidak dapat ditanam di dalam kode. Jika ini pertama kali melakukan deploy, mohon <strong>Aktifkan Fitur Email/Password Auth</strong> di Firebase Console, lalu tambahkan admin: <strong className="text-slate-700">{email}</strong> dengan password yang diminta.
          </div>
        </div>
      </div>
    </div>
  );
};
