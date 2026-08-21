import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronDown,
} from 'lucide-react';
import { User } from '../types';
import { AHTLogo } from './AHTLogo';

interface LoginViewProps {
  users: User[];
  onLogin: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, onLogin }) => {
  const [emailOrUsername, setEmailOrUsername] = useState(() => {
    return localStorage.getItem('smart_auth_email_saved') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanInput = emailOrUsername.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanInput) {
      setErrorMsg('Vui lòng chọn hoặc nhập Email / Tên đăng nhập của bạn.');
      return;
    }
    if (!cleanPass) {
      setErrorMsg('Vui lòng nhập mật khẩu tài khoản.');
      return;
    }

    // Match user by email or username or partial email name or exact full name
    const foundUser = users.find((u) => {
      const emailLower = u.email.toLowerCase();
      const usernameLower = u.username.toLowerCase();
      const emailPrefix = emailLower.split('@')[0];

      return (
        emailLower === cleanInput ||
        usernameLower === cleanInput ||
        emailPrefix === cleanInput ||
        u.fullName.toLowerCase() === cleanInput
      );
    });

    if (!foundUser) {
      setErrorMsg('Không tìm thấy tài khoản với thông tin này. Vui lòng kiểm tra lại tên đăng nhập hoặc chọn từ danh sách.');
      return;
    }

    // Verify password: check user.password or user.defaultPassword or custom aliases
    const validPasswords = [
      foundUser.password,
      foundUser.defaultPassword,
      `${foundUser.username}12345`,
      `${foundUser.email.split('@')[0]}12345`,
    ].filter(Boolean);

    const isMatch = validPasswords.some((p) => p?.toLowerCase() === cleanPass.toLowerCase());

    if (!isMatch) {
      setErrorMsg('Mật khẩu không chính xác! Vui lòng kiểm tra lại hoặc liên hệ Quản lý để được hỗ trợ.');
      return;
    }

    // Save remember me preference
    if (rememberMe) {
      localStorage.setItem('smart_auth_email_saved', foundUser.email);
    } else {
      localStorage.removeItem('smart_auth_email_saved');
    }

    onLogin(foundUser);
  };

  const handleSelectFromDropdown = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedEmail = e.target.value;
    if (selectedEmail) {
      setEmailOrUsername(selectedEmail);
      setErrorMsg(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background grid and ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Branding header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl mb-4">
            <AHTLogo className="h-10 w-auto" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Quản Lý Kho Thông Minh
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Hệ thống Quản lý Vật tư Xuất - Nhập - Tồn
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 py-8 px-6 sm:px-8 shadow-2xl rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <span className="text-sm font-semibold text-slate-200">Đăng Nhập Hệ Thống</span>
            <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Bảo Mật Nội Bộ
            </span>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Dropdown to select member name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" /> Chọn tên thành viên từ danh sách
                </span>
                <span className="text-[11px] text-slate-400">({users.length} tài khoản)</span>
              </label>
              <div className="relative">
                <select
                  id="select-user-login-dropdown"
                  onChange={handleSelectFromDropdown}
                  value={
                    users.some((u) => u.email.toLowerCase() === emailOrUsername.toLowerCase())
                      ? emailOrUsername
                      : ''
                  }
                  className="w-full bg-slate-800/90 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer pr-10"
                >
                  <option value="" disabled>
                    -- Chọn họ và tên đăng nhập --
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.email} className="bg-slate-800 text-white font-normal py-1">
                      {u.fullName}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Manual Email / Username input */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email hoặc Tên tài khoản
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  value={emailOrUsername}
                  onChange={(e) => {
                    setEmailOrUsername(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="ví dụ: vn.phuoc235@gmail.com hoặc hapham281@gmail.com"
                  className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mật khẩu đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Nhập mật khẩu của bạn"
                  className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <span>Ghi nhớ tài khoản này</span>
              </label>
            </div>

            <button
              type="submit"
              id="btn-submit-login"
              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập Vào Kho</span>
            </button>
          </form>
        </div>

        {/* Security badge footer */}
        <p className="text-center text-xs text-slate-400 mt-5 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Hệ thống bảo mật & Quản lý tồn kho chuẩn AHT
        </p>
      </div>
    </div>
  );
};

export default LoginView;
