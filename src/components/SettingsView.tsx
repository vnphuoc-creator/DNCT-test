import React, { useState, useRef } from 'react';
import {
  Settings,
  Building2,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Check,
  Save,
  CheckCircle2,
  Upload,
  RefreshCw,
  Layers,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Database,
  Image as ImageIcon,
} from 'lucide-react';
import { STANDARD_UNITS } from '../data/seedData';
import { User, Material, InventoryTransaction } from '../types';
import { AHTLogo } from './AHTLogo';
import { ExcelStockImportModal } from './ExcelStockImportModal';

interface SettingsViewProps {
  currentUser: User;
  allUsers: User[];
  materials: Material[];
  transactions: InventoryTransaction[];
  onUpdateMaterials?: (materials: Material[]) => void;
  onUpdateUsers?: (users: User[]) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  allUsers,
  materials,
  transactions,
  onUpdateMaterials,
  onUpdateUsers,
}) => {
  const [activeTab, setActiveTab] = useState<'UNITS_PASSWORD' | 'LOGO_COMPANY' | 'IMPORT_STOCK' | 'BACKUP'>('UNITS_PASSWORD');

  // --- UNIT MANAGEMENT STATE ---
  const [units, setUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('cfg_custom_units');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return STANDARD_UNITS;
      }
    }
    return [
      'Chai',
      'Hộp',
      'Kg',
      'Túi',
      'Vỉ',
      'Cái',
      'Gói',
      'Lọ',
      'Miếng',
      'Bộ',
      'Mét',
      'Cuộn',
      'Cây',
      'Bình',
      'Thùng',
      'Lít',
      'Ống',
      'Sợi',
      'Hũ',
      'Bịch',
    ];
  });

  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [editingUnitIndex, setEditingUnitIndex] = useState<number | null>(null);
  const [unitInputValue, setUnitInputValue] = useState('');
  const [unitToast, setUnitToast] = useState<string | null>(null);

  // --- PASSWORD CHANGE STATE ---
  const [selectedUserToChangePass, setSelectedUserToChangePass] = useState<string>(currentUser.id);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // --- LOGO & COMPANY INFO STATE ---
  const [companyName, setCompanyName] = useState(() => {
    return localStorage.getItem('cfg_company_name') || 'CÔNG TY CỔ PHẦN ĐẦU TƯ KHAI THÁC NHÀ GA QUỐC TẾ ĐÀ NẴNG (AHT)';
  });
  const [departmentName, setDepartmentName] = useState(() => {
    return localStorage.getItem('cfg_department_name') || 'Đội Điện Nước Công Trình (DOIDNCT)';
  });
  const [circularStandard, setCircularStandard] = useState(() => {
    return localStorage.getItem('cfg_circular') || 'Thông tư 99/2025/TT-BTC';
  });
  const [companySaveSuccess, setCompanySaveSuccess] = useState(false);

  // Logo file upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem('smart_custom_logo');
  });

  // --- EXCEL IMPORT MODAL STATE ---
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Security guard: Admin only
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white">Yêu Cầu Quyền Quản Trị Viên (Admin)</h2>
        <p className="text-xs text-slate-400">
          Chức năng Cài Đặt Hệ Thống được bảo vệ và chỉ dành riêng cho tài khoản Quản lý / Admin để cấu hình thông tin doanh nghiệp, đơn vị tính và cập nhật số liệu kho.
        </p>
      </div>
    );
  }

  // --- UNIT ACTIONS ---
  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = unitInputValue.trim();
    if (!trimmed) return;

    let updated = [...units];
    if (editingUnitIndex !== null) {
      updated[editingUnitIndex] = trimmed;
      setUnitToast(`Đã cập nhật đơn vị tính: "${trimmed}"`);
    } else {
      if (!updated.includes(trimmed)) {
        updated.push(trimmed);
        setUnitToast(`Đã thêm đơn vị tính: "${trimmed}"`);
      }
    }

    setUnits(updated);
    localStorage.setItem('cfg_custom_units', JSON.stringify(updated));
    setShowAddUnitModal(false);
    setEditingUnitIndex(null);
    setUnitInputValue('');
    setTimeout(() => setUnitToast(null), 3000);
  };

  const handleDeleteUnit = (index: number) => {
    const item = units[index];
    const updated = units.filter((_, idx) => idx !== index);
    setUnits(updated);
    localStorage.setItem('cfg_custom_units', JSON.stringify(updated));
    setUnitToast(`Đã xóa đơn vị tính: "${item}"`);
    setTimeout(() => setUnitToast(null), 3000);
  };

  // --- PASSWORD ACTIONS ---
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!newPassword) {
      setPasswordError('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (newPassword.length < 5) {
      setPasswordError('Mật khẩu mới phải có ít nhất 5 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    // Save to allUsers in localStorage
    const savedUsers = localStorage.getItem('smart_users_v6');
    if (savedUsers) {
      try {
        const parsed: User[] = JSON.parse(savedUsers);
        const target = parsed.find((u) => u.id === selectedUserToChangePass);
        if (target) {
          target.password = newPassword;
          localStorage.setItem('smart_users_v6', JSON.stringify(parsed));
          if (onUpdateUsers) onUpdateUsers(parsed);
        }
      } catch (err) {
        console.error(err);
      }
    }

    setPasswordSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  // --- COMPANY INFO ACTIONS ---
  const handleSaveCompanyInfo = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cfg_company_name', companyName);
    localStorage.setItem('cfg_department_name', departmentName);
    localStorage.setItem('cfg_circular', circularStandard);
    setCompanySaveSuccess(true);
    setTimeout(() => setCompanySaveSuccess(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa là 3MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCustomLogoUrl(dataUrl);
      localStorage.setItem('smart_custom_logo', dataUrl);
      window.dispatchEvent(new Event('storage'));
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setCustomLogoUrl(null);
    localStorage.removeItem('smart_custom_logo');
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-400" />
              Cài Đặt Hệ Thống (Dành Cho Admin)
            </h1>
            <span className="bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Quản Trị
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý danh mục đơn vị tính, bảo mật mật khẩu, logo nhận diện và cập nhật số lượng tồn kho tự động
          </p>
        </div>

        {/* Quick button to open Excel stock importer */}
        <button
          onClick={() => setIsExcelModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/30 shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Import File Tồn Kho & Cập Nhật Số Lượng</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('UNITS_PASSWORD')}
          className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'UNITS_PASSWORD'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Đơn Vị Tính & Đổi Mật Khẩu</span>
        </button>

        <button
          onClick={() => setActiveTab('LOGO_COMPANY')}
          className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'LOGO_COMPANY'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Logo & Thông Tin Doanh Nghiệp (AHT)</span>
        </button>

        <button
          onClick={() => setActiveTab('IMPORT_STOCK')}
          className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'IMPORT_STOCK'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Import File Tồn Kho (Excel / CSV)</span>
        </button>

        <button
          onClick={() => setActiveTab('BACKUP')}
          className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'BACKUP'
              ? 'border-blue-500 text-blue-400 bg-blue-500/10 rounded-t-xl'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Sao Lưu & Dữ Liệu</span>
        </button>
      </div>

      {/* Toast Notification */}
      {unitToast && (
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-2 text-xs text-blue-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400" />
          <span>{unitToast}</span>
        </div>
      )}

      {/* TAB 1: EXACT MATCH TO IMAGE 2 (2 COLUMNS: UNITS ON LEFT, PASSWORD ON RIGHT) */}
      {activeTab === 'UNITS_PASSWORD' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Đơn Vị Tính (col-span-7) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wide">Đơn vị tính</h2>
              </div>

              <button
                type="button"
                id="btn-add-unit-modal"
                onClick={() => {
                  setEditingUnitIndex(null);
                  setUnitInputValue('');
                  setShowAddUnitModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            {/* List of Units with Edit / Delete Pills */}
            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              {units.map((unitName, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-850/60 transition-colors"
                >
                  <span className="text-xs font-medium text-slate-200">{unitName}</span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUnitIndex(idx);
                        setUnitInputValue(unitName);
                        setShowAddUnitModal(true);
                      }}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 transition-colors"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUnit(idx)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Đổi Mật Khẩu Đăng Nhập (col-span-5) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">Đổi mật khẩu đăng nhập</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              {/* Select User to change password */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Tên đăng nhập:</label>
                <select
                  value={selectedUserToChangePass}
                  onChange={(e) => setSelectedUserToChangePass(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role === 'ADMIN' ? 'Admin' : 'Nhân viên'}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Mật khẩu mới:</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Xác nhận mật khẩu mới:</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Error / Success feedback */}
              {passwordError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Đổi mật khẩu thành công!</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                id="btn-submit-change-password"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Đổi mật khẩu</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: LOGO & COMPANY INFO */}
      {activeTab === 'LOGO_COMPANY' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logo Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">Logo & Nhận diện AHT</h2>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col items-center justify-center space-y-3 text-center">
              <div className="p-3 bg-white/10 rounded-xl border border-slate-700">
                <AHTLogo className="h-12" allowUpload={false} />
              </div>
              <span className="text-xs text-slate-400">Xem trước logo hiển thị trên Header và Phiếu in PDF</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải Logo Mới Từ Máy Tính</span>
              </button>

              {customLogoUrl && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl transition-colors border border-slate-700"
                >
                  Đặt lại mặc định
                </button>
              )}
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">Thông tin doanh nghiệp & Mẫu biểu</h2>
            </div>

            <form onSubmit={handleSaveCompanyInfo} className="space-y-3.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Tên công ty / Đơn vị:</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Bộ phận / Đội phụ trách:</label>
                <input
                  type="text"
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Quy chuẩn / Mẫu thông tư:</label>
                <input
                  type="text"
                  value={circularStandard}
                  onChange={(e) => setCircularStandard(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {companySaveSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Đã lưu thông tin doanh nghiệp thành công!</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu Cấu Hình Mẫu Biểu</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: IMPORT STOCK FILE */}
      {activeTab === 'IMPORT_STOCK' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import File Vật Tư & Cập Nhật Tồn Kho Hàng Loạt</h2>
              <p className="text-xs text-slate-400">
                Cho phép tải lên file Excel chứa số liệu Xuất - Nhập - Tồn thực tế để cập nhật tự động toàn bộ hơn 600 vật tư lên website
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Quy trình cập nhật dữ liệu:</h3>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 leading-relaxed">
              <li>Nhấp nút <strong>"Mở Công Cụ Import Excel"</strong> bên dưới.</li>
              <li>Chọn hoặc kéo thả file Excel (.xlsx) / CSV chứa danh sách vật tư và số lượng tồn cuối kỳ.</li>
              <li>Hệ thống sẽ đối chiếu mã vật tư chuẩn <code className="text-blue-400 font-mono">DN_*</code>, tự động cập nhật số lượng tồn kho và đơn giá mới nhất.</li>
              <li>Nếu phát hiện mã mới chưa có, hệ thống sẽ tự động thêm mới vào danh mục quản lý.</li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsExcelModalOpen(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Mở Công Cụ Import Excel & Cập Nhật Tồn Kho</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'BACKUP' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">Sao Lưu Dữ Liệu (JSON)</h2>
            </div>
            <p className="text-xs text-slate-400">
              Xuất toàn bộ danh mục vật tư ({materials.length} mã) và lịch sử giao dịch ({transactions.length} phiếu) thành file JSON để lưu trữ an toàn.
            </p>
            <button
              onClick={() => {
                const dump = {
                  exportDate: new Date().toISOString(),
                  materials,
                  transactions,
                  users: allUsers,
                  units,
                };
                const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Backup_Kho_VatTu_AHT_${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl border border-slate-700 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Tải Bản Sao Lưu Dự Phòng (.json)</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">Khôi Phục Dữ Liệu Gốc</h2>
            </div>
            <p className="text-xs text-slate-400">
              Đặt lại toàn bộ danh mục vật tư về dữ liệu gốc tiêu chuẩn của Đội Điện Nước AHT (&gt;600 vật tư).
            </p>
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn đặt lại toàn bộ danh mục vật tư và tài khoản về mặc định không?')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Đặt Lại Danh Mục Gốc Mặc Định</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Unit */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">
              {editingUnitIndex !== null ? 'Chỉnh Sửa Đơn Vị Tính' : 'Thêm Đơn Vị Tính Mới'}
            </h3>

            <form onSubmit={handleSaveUnit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tên đơn vị tính:</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={unitInputValue}
                  onChange={(e) => setUnitInputValue(e.target.value)}
                  placeholder="Ví dụ: Mét, Cuộn, Cây, Thùng..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded Excel Stock Import Modal */}
      <ExcelStockImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        currentMaterials={materials}
        onApplyStockUpdate={(updated) => {
          if (onUpdateMaterials) {
            onUpdateMaterials(updated);
          }
          localStorage.setItem('smart_materials_v6', JSON.stringify(updated));
          setUnitToast(`Đã cập nhật thành công ${updated.length} vật tư lên hệ thống web!`);
          setTimeout(() => setUnitToast(null), 4000);
        }}
      />
    </div>
  );
};
