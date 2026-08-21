import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  KeyRound,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react';
import { User } from '../types';
import { AHTLogo } from './AHTLogo';

interface NavbarProps {
  currentUser: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingApprovalsCount: number;
  onOpenAiSearch: () => void;
  onLogout?: () => void;
  onOpenChangePassword?: () => void;
  onToggleSidebar?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  pendingApprovalsCount,
  onOpenAiSearch,
  onLogout,
  onOpenChangePassword,
  onToggleSidebar,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tab Title mapping
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Tổng Quan & Thống Kê Kho';
      case 'materials':
        return 'Danh Mục Vật Tư Điện Nước';
      case 'transactions':
        return 'Quản Lý Phiếu Xuất - Nhập - Tồn';
      case 'ledger':
        return 'Thẻ Kho & Báo Cáo Tổng Hợp NXT';
      case 'users':
        return 'Phân Quyền & Quản Trị Người Dùng';
      case 'settings':
        return 'Cài Đặt & Cấu Hình Hệ Thống';
      case 'ai':
        return 'Trợ Lý AI Kho Thông Minh';
      default:
        return 'Hệ Thống Quản Lý Kho';
    }
  };

  return (
    <header className="bg-slate-900/95 border-b border-slate-800 text-white sticky top-0 z-30 shadow-sm no-print transition-colors duration-200">
      {/* Prominent Pending Approval Notification Bar for Admin */}
      {currentUser.role === 'ADMIN' && pendingApprovalsCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/25 to-amber-500/20 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-lg bg-amber-500 text-slate-950 animate-bounce shrink-0">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs font-semibold text-amber-200 truncate">
              <span className="font-bold text-amber-300">Thông báo quan trọng:</span> Có{' '}
              <span className="font-black text-white underline underline-offset-2">
                {pendingApprovalsCount} phiếu kho
              </span>{' '}
              đang chờ bạn kiểm tra & phê duyệt.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTabChange('transactions')}
            className="shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 transition-all shadow-md shadow-amber-500/30"
          >
            <span>Xem & Duyệt Ngay</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Left: Mobile Toggle & Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Mở thanh điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Logo display */}
            <div className="lg:hidden flex items-center">
              <AHTLogo className="h-7" showPlane={false} allowUpload={false} />
            </div>

            <div className="hidden sm:block truncate">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {getTabTitle()}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                Đội Điện Nước Công Trình &bull; Cảng HKQT Đà Nẵng
              </p>
            </div>
          </div>

          {/* Center: Smart Search Trigger */}
          <div className="flex-1 max-w-md mx-2 hidden md:block">
            <button
              type="button"
              id="btn-ai-search-quick"
              onClick={onOpenAiSearch}
              className="w-full flex items-center gap-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs transition-all shadow-inner group"
            >
              <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform shrink-0" />
              <span className="flex-1 text-left truncate">Tìm kiếm nhanh mã DN_* bằng AI...</span>
              <kbd className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                AI
              </kbd>
            </button>
          </div>

          {/* Right section: Theme Switcher & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile AI button */}
            <button
              type="button"
              onClick={onOpenAiSearch}
              className="md:hidden p-2 rounded-xl bg-slate-800 text-amber-400 border border-slate-700"
              title="Tìm kiếm AI"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Theme Toggle Button (Light / Dark Mode) */}
            {onToggleTheme && (
              <button
                type="button"
                id="btn-toggle-theme"
                onClick={onToggleTheme}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-amber-300 flex items-center gap-1.5 text-xs transition-all shadow-sm group"
                title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
                    <span className="hidden md:inline font-medium text-slate-300 group-hover:text-white">Giao diện Sáng</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-400 group-hover:-rotate-12 transition-transform" />
                    <span className="hidden md:inline font-medium text-slate-300 group-hover:text-white">Giao diện Tối</span>
                  </>
                )}
              </button>
            )}

            {/* User Profile Pill */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                id="btn-user-profile-menu"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold flex items-center justify-center text-xs">
                  {currentUser.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(-2)
                    .join('')}
                </div>
                <div className="text-left hidden sm:block max-w-[170px] truncate">
                  <div className="font-bold text-white truncate text-xs">
                    Xin chào, {currentUser.fullName}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {/* Personal Account Profile Menu (No switch user list) */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                  {/* User info card */}
                  <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold flex items-center justify-center text-sm shrink-0">
                        {currentUser.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(-2)
                          .join('')}
                      </div>
                      <div className="truncate min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {currentUser.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {currentUser.email}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{currentUser.department || 'Đội Điện Nước'}</span>
                      {currentUser.role === 'ADMIN' ? (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                          Quản lý (Admin)
                        </span>
                      ) : (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                          Nhân viên
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions list */}
                  <div className="space-y-1">
                    {/* Change Password Option */}
                    {onOpenChangePassword && (
                      <button
                        type="button"
                        id="btn-menu-change-password"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onOpenChangePassword();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <KeyRound className="w-4 h-4 text-blue-400" />
                        <span>Đổi mật khẩu tài khoản</span>
                      </button>
                    )}

                    {/* Quick Theme toggle in menu */}
                    {onToggleTheme && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleTheme();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors font-medium"
                      >
                        <span className="flex items-center gap-2.5">
                          {theme === 'dark' ? (
                            <Sun className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Moon className="w-4 h-4 text-indigo-400" />
                          )}
                          <span>Giao diện {theme === 'dark' ? 'Sáng' : 'Tối'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          {theme}
                        </span>
                      </button>
                    )}

                    {/* Logout Option */}
                    {onLogout && (
                      <button
                        type="button"
                        id="btn-menu-logout"
                        onClick={() => {
                          setShowUserDropdown(false);
                          onLogout();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors font-medium border-t border-slate-800 mt-1"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất tài khoản</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
