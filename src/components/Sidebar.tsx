import React from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  LogOut,
  KeyRound,
  X,
  Settings,
} from 'lucide-react';
import { User } from '../types';
import { AHTLogo } from './AHTLogo';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  pendingApprovalsCount: number;
  onLogout: () => void;
  onOpenChangePassword?: () => void;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  pendingApprovalsCount,
  onLogout,
  onOpenChangePassword,
  isOpenMobile,
  onToggleMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Tổng Quan',
      icon: LayoutDashboard,
      description: 'Báo cáo & cảnh báo tồn kho',
    },
    {
      id: 'materials',
      label: 'Danh Mục Vật Tư',
      icon: Package,
      description: 'Định mức & quy cách (>600 mã DN)',
    },
    {
      id: 'transactions',
      label: 'Xuất - Nhập - Tồn',
      icon: ArrowLeftRight,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold',
      description: 'Lập & duyệt theo Tờ trình',
    },
    {
      id: 'ledger',
      label: 'Thẻ Kho & Báo Cáo NXT',
      icon: FileSpreadsheet,
      description: 'Mẫu TT 99/2025/TT-BTC & PDF',
    },
    // ADMIN ONLY: Completely hidden if not ADMIN!
    ...(currentUser.role === 'ADMIN'
      ? [
          {
            id: 'users',
            label: 'Phân Quyền Người Dùng',
            icon: ShieldCheck,
            badge: 'Admin',
            badgeColor: 'bg-blue-600/30 text-blue-300 border border-blue-500/40',
            description: 'Quản lý tài khoản',
          },
          {
            id: 'settings',
            label: 'Cài Đặt Hệ Thống',
            icon: Settings,
            badge: 'Admin',
            badgeColor: 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40',
            description: 'Logo, ĐVT, Mật khẩu & Import',
          },
        ]
      : []),
    {
      id: 'ai',
      label: 'Trợ Lý AI Kho',
      icon: Sparkles,
      badge: 'AI',
      badgeColor: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold',
      description: 'Truy vấn & Phân tích',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggleMobile}
        />
      )}

      {/* Vertical Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 no-print ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Brand / Logo Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col gap-3 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <AHTLogo className="h-9" allowUpload={false} />
            <button
              onClick={onToggleMobile}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <div className="text-[13px] font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
              <span>Đội Điện Nước Công Trình</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Cảng HKQT Đà Nẵng (AHT)</span>
            </div>
          </div>
        </div>

        {/* Main Vertical Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5 no-scrollbar">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Quản Lý
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  onTabChange(item.id);
                  if (isOpenMobile) onToggleMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-blue-400'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs tracking-tight">{item.label}</div>
                    <div
                      className={`text-[10px] truncate ${
                        isActive ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-sans ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Profile & Actions (Single logged-in user, no dropdown switch list) */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold flex items-center justify-center text-xs shrink-0">
                {currentUser.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .slice(-2)
                  .join('')}
              </div>
              <div className="truncate min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {currentUser.role === 'ADMIN' ? 'Ban Quản Lý (Admin)' : (currentUser.department || 'Nhân viên')}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
              {onOpenChangePassword && (
                <button
                  type="button"
                  onClick={onOpenChangePassword}
                  className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60"
                  title="Đổi mật khẩu tài khoản"
                >
                  <KeyRound className="w-3 h-3 text-blue-400" />
                  <span>Đổi MK</span>
                </button>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="py-1 px-2.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors border border-rose-800/40"
                title="Đăng xuất khỏi hệ thống"
              >
                <LogOut className="w-3 h-3" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
