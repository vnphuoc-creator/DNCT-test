import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
} from 'lucide-react';
import { User } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onSuccessToast?: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onSuccessToast,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCurrent = currentPassword.trim();
    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanCurrent) {
      setErrorMsg('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    // Verify current password against known valid values
    const validCurrentPasswords = [
      currentUser.password,
      currentUser.defaultPassword,
      `${currentUser.username}12345`,
      `${currentUser.email.split('@')[0]}12345`,
    ].filter(Boolean);

    const isCurrentCorrect = validCurrentPasswords.some(
      (p) => p?.toLowerCase() === cleanCurrent.toLowerCase()
    );

    if (!isCurrentCorrect) {
      setErrorMsg('Mật khẩu hiện tại không đúng. Vui lòng kiểm tra lại.');
      return;
    }

    if (cleanNew.length < 4) {
      setErrorMsg('Mật khẩu mới phải có độ dài tối thiểu 4 ký tự.');
      return;
    }

    if (cleanNew === cleanCurrent) {
      setErrorMsg('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setErrorMsg('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    // Update user password
    const updatedUser: User = {
      ...currentUser,
      password: cleanNew,
      defaultPassword: cleanNew,
    };

    onUpdateUser(updatedUser);
    setIsSuccess(true);
    if (onSuccessToast) {
      onSuccessToast(`Đã đổi mật khẩu thành công cho tài khoản ${currentUser.fullName}!`);
    }

    setTimeout(() => {
      setIsSuccess(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    }, 1500);
  };

  const handleClose = () => {
    setErrorMsg(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                Đổi Mật Khẩu Cá Nhân
              </h3>
              <p className="text-xs text-slate-400">
                Tài khoản: <span className="text-blue-300 font-medium">{currentUser.fullName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5">
          {isSuccess ? (
            <div className="py-6 text-center space-y-2 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Đổi Mật Khẩu Thành Công!</h4>
              <p className="text-xs text-slate-400">
                Mật khẩu mới đã được cập nhật an toàn vào hệ thống.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-300 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div className="leading-relaxed">{errorMsg}</div>
                </div>
              )}

              {/* Current password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mật khẩu hiện tại <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Nhập mật khẩu đang dùng"
                    className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl pl-3.5 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mật khẩu mới <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="Tối thiểu 4 ký tự"
                    className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl pl-3.5 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Xác nhận mật khẩu mới <span className="text-rose-400">*</span>
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full bg-slate-800/80 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  id="btn-confirm-change-pass"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Cập Nhật Mật Khẩu</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
