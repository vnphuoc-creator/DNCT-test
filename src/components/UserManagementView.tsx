import React, { useState } from 'react';
import {
  Users,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Key,
  Search,
  Building,
  UserCheck,
  Info,
  Lock,
  Unlock,
  Edit3,
  UserPlus,
  Save,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { User } from '../types';

interface UserManagementViewProps {
  currentUser: User;
  allUsers: User[];
  onSelectUser: (user: User) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onAddUser?: (newUser: User) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  onUpdateUser,
  onAddUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'STAFF'>('ALL');

  // Security Password Protection State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Edit User State (When Unlocked)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // New User Form State
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'STAFF'>('STAFF');
  const [newNote, setNewNote] = useState('');

  const adminCount = allUsers.filter((u) => u.role === 'ADMIN').length;
  const staffCount = allUsers.filter((u) => u.role === 'STAFF').length;

  const filteredUsers = allUsers.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchName = u.fullName.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchNote = u.note?.toLowerCase().includes(q) || false;
      if (!matchName && !matchEmail && !matchNote) return false;
    }
    return true;
  });

  // Verify Admin Password to Unlock Editing
  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    const inputTrimmed = adminPasswordInput.trim();
    if (!inputTrimmed) {
      setPasswordError('Vui lòng nhập mật khẩu quản trị viên.');
      return;
    }

    // Check if input matches master password or any Admin user password
    const adminUsers = allUsers.filter((u) => u.role === 'ADMIN');
    const isMatched =
      inputTrimmed === 'admin123' ||
      inputTrimmed === 'admin@123' ||
      inputTrimmed === 'aht12345' ||
      adminUsers.some(
        (adm) =>
          adm.password === inputTrimmed ||
          adm.defaultPassword === inputTrimmed ||
          `${adm.username}12345` === inputTrimmed
      );

    if (isMatched) {
      setIsUnlocked(true);
      setIsPasswordModalOpen(false);
      setAdminPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Mật khẩu không chính xác. Vui lòng nhập mật khẩu của Quản lý (Admin).');
    }
  };

  // Switch User Role Quick Action (When Unlocked)
  const handleToggleRole = (user: User) => {
    if (!isUnlocked) {
      setIsPasswordModalOpen(true);
      return;
    }
    const newRole: 'ADMIN' | 'STAFF' = user.role === 'ADMIN' ? 'STAFF' : 'ADMIN';
    const newRoleName = newRole === 'ADMIN' ? 'Quản lý' : 'Nhân viên';
    const updatedNote =
      newRole === 'ADMIN'
        ? 'Quản lý toàn bộ hệ thống, danh mục, xét duyệt phiếu nhập/xuất'
        : 'Nhân viên - Lập đề xuất nhập/xuất, tra cứu tồn kho thực tế';

    const updatedUser: User = {
      ...user,
      role: newRole,
      roleName: newRoleName,
      note: updatedNote,
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
  };

  // Save User Edit Form
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !onUpdateUser) return;
    onUpdateUser(editingUser);
    setEditingUser(null);
  };

  // Add New User Form
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim()) return;

    const username = newUsername.trim() || newEmail.split('@')[0];
    const password = newPassword.trim() || `${username}12345`;
    const avatarColors = [
      'bg-blue-600',
      'bg-indigo-600',
      'bg-violet-600',
      'bg-emerald-600',
      'bg-cyan-600',
      'bg-amber-600',
    ];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const newUser: User = {
      id: `usr_${Date.now()}`,
      stt: allUsers.length + 1,
      username: username,
      fullName: newFullName.trim(),
      email: newEmail.trim(),
      role: newRole,
      roleName: newRole === 'ADMIN' ? 'Quản lý' : 'Nhân viên',
      note:
        newNote.trim() ||
        (newRole === 'ADMIN'
          ? 'Quản lý toàn quyền hệ thống'
          : 'Nhân viên tác nghiệp lập đề xuất'),
      avatarColor: randomColor,
      password: password,
      defaultPassword: password,
    };

    if (onAddUser) {
      onAddUser(newUser);
    }

    // Reset
    setNewFullName('');
    setNewEmail('');
    setNewUsername('');
    setNewPassword('');
    setNewNote('');
    setIsAddUserModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Security Unlock Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Phân Quyền & Quản Lý Người Dùng
            </h1>
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {allUsers.length} tài khoản
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Bảo mật phân định quyền hạn Quản lý (Admin) và Nhân viên theo mật khẩu xác thực
          </p>
        </div>

        {/* Lock / Unlock Security Status Button */}
        <div className="flex items-center gap-2">
          {isUnlocked ? (
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shadow-sm">
                <Unlock className="w-3.5 h-3.5 text-emerald-400" /> Đã Mở Khóa Chỉnh Sửa
              </span>
              <button
                type="button"
                id="btn-add-new-user"
                onClick={() => setIsAddUserModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" /> + Thêm Tài Khoản
              </button>
              <button
                type="button"
                id="btn-lock-security"
                onClick={() => setIsUnlocked(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Khóa Lại
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="btn-unlock-security"
              onClick={() => {
                setPasswordError('');
                setAdminPasswordInput('');
                setIsPasswordModalOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-600/20"
            >
              <Lock className="w-4 h-4" />
              <span>Nhập Mật Khẩu Để Chỉnh Sửa Phân Quyền</span>
            </button>
          )}
        </div>
      </div>

      {/* Security Status Alert Banner */}
      {!isUnlocked && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-300">Chế độ xem an toàn: </span>
              Chức năng chỉnh sửa vai trò, mật khẩu và thêm nhân sự được bảo vệ bằng mật khẩu quản trị.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPasswordError('');
              setAdminPasswordInput('');
              setIsPasswordModalOpen(true);
            }}
            className="text-amber-300 hover:text-white underline font-semibold shrink-0 cursor-pointer"
          >
            Mở khóa ngay &rarr;
          </button>
        </div>
      )}

      {/* Role Comparison Table Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Role Scope */}
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Vai Trò: Quản Lý (Admin)</h3>
                <span className="text-[11px] text-rose-300 font-medium font-mono">
                  {adminCount} người dùng sở hữu vai trò này
                </span>
              </div>
            </div>
            <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-full font-bold">
              Toàn quyền hệ thống
            </span>
          </div>

          <p className="text-xs text-slate-300">
            <strong>Ghi chú quyền hạn theo thiết kế:</strong> Quản lý toàn bộ danh mục vật tư, thiết lập định mức an toàn (Min/Max), đơn giá, xét duyệt hoặc từ chối phiếu xuất/nhập, xem toàn bộ báo cáo tổng hợp.
          </p>

          <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Thêm mới, sửa, xóa mã vật tư trong danh mục</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Phê duyệt hoặc từ chối các đề xuất nhập/xuất kho của nhân viên</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Tạo phiếu nhập/xuất trực tiếp (tự động duyệt & cập nhật kho)</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Cấu hình ngưỡng định mức cảnh báo tồn kho và xuất báo cáo</span>
            </div>
          </div>
        </div>

        {/* Staff Role Scope */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Vai Trò: Nhân Viên (Staff)</h3>
                <span className="text-[11px] text-emerald-300 font-medium font-mono">
                  {staffCount} người dùng sở hữu vai trò này
                </span>
              </div>
            </div>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full font-bold">
              Quyền tác nghiệp
            </span>
          </div>

          <p className="text-xs text-slate-300">
            <strong>Ghi chú quyền hạn theo thiết kế:</strong> Xem tồn kho thực tế, tra cứu thẻ kho, tạo đề xuất nhập/xuất vật tư. Phiếu tạo ra sẽ ở trạng thái Chờ Duyệt (Pending) gửi đến Quản lý.
          </p>

          <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Xem danh mục và số lượng tồn kho khả dụng thời gian thực</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Lập phiếu đề xuất nhập kho và đề xuất xuất kho</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Tra cứu sổ thẻ kho và in phiếu chứng từ giao nhận</span>
            </div>
            <div className="flex items-center gap-2 text-rose-400">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>Không được tự ý duyệt phiếu hoặc chỉnh sửa danh mục vật tư</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Directory Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              roleFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Tất cả ({allUsers.length})
          </button>
          <button
            onClick={() => setRoleFilter('ADMIN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              roleFilter === 'ADMIN'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Quản lý (Admin - {adminCount})
          </button>
          <button
            onClick={() => setRoleFilter('STAFF')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              roleFilter === 'STAFF'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Nhân viên (Staff - {staffCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên, email..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Users List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => {
          const isCurrent = user.id === currentUser.id;
          return (
            <div
              key={user.id}
              className={`bg-slate-900 border ${
                isCurrent
                  ? 'border-blue-500 ring-1 ring-blue-500/40 bg-blue-950/20'
                  : 'border-slate-800 hover:border-slate-700'
              } rounded-2xl p-4 transition-all flex flex-col justify-between shadow-sm`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${
                        user.avatarColor || 'bg-blue-600'
                      } text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0`}
                    >
                      {user.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(-2)
                        .join('')}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{user.fullName}</h4>
                      <p className="text-[11px] text-slate-400 font-mono truncate max-w-[170px]">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                      user.role === 'ADMIN'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {user.role === 'ADMIN' ? 'Quản lý (Admin)' : 'Nhân viên'}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 text-xs space-y-1.5">
                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Mật khẩu đăng nhập: </span>
                    <code className="text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-mono text-[10px]">
                      {user.defaultPassword || user.password || `${user.username}12345`}
                    </code>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Ghi chú quyền: </span>
                    <span className="text-slate-300 italic">{user.note}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                {/* Admin Role Editing Controls (Available when Unlocked) */}
                {isUnlocked && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleRole(user)}
                      className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 ${
                        user.role === 'ADMIN'
                          ? 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/60'
                          : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                      }`}
                    >
                      <Key className="w-3 h-3" />
                      <span>Đổi sang {user.role === 'ADMIN' ? 'Nhân viên' : 'Quản lý'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUser(user)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-xl border border-slate-700"
                      title="Sửa thông tin / mật khẩu"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Account Switch Button */}
                <div>
                  {isCurrent ? (
                    <span className="text-[11px] font-semibold text-blue-400 flex items-center gap-1 justify-center py-1">
                      <UserCheck className="w-3.5 h-3.5" /> Đang đăng nhập
                    </span>
                  ) : (
                    <button
                      id={`btn-switch-user-${user.id}`}
                      onClick={() => onSelectUser(user)}
                      className="w-full bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white py-1.5 rounded-xl text-xs font-semibold transition-colors text-center"
                    >
                      Chuyển sang tài khoản này &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADMIN PASSWORD PROMPT TO UNLOCK EDITING */}
      {/* ========================================================================= */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Xác Thực Mật Khẩu Quản Trị</h3>
                <p className="text-xs text-slate-400">
                  Vui lòng nhập mật khẩu của Quản lý để mở khóa chỉnh sửa phân quyền
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyPassword} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mật khẩu Quản lý (Admin):
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    placeholder="Nhập mật khẩu Admin..."
                    autoFocus
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {passwordError}
                  </p>
                )}
                <div className="mt-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                  <span className="text-slate-300 font-medium">Gợi ý mật khẩu: </span>
                  Mật khẩu của tài khoản Admin bất kỳ (ví dụ: <code className="text-amber-400">phuoc.vy12345</code>, <code className="text-amber-400">duc.nguyen12345</code>, <code className="text-amber-400">ha.pham12345</code>, hoặc <code className="text-amber-400">admin123</code>).
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                >
                  <Unlock className="w-3.5 h-3.5" /> Mở Khóa Chỉnh Sửa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT USER DETAILS / PASSWORD */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" /> Sửa Thông Tin Nhân Sự
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={editingUser.fullName}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, fullName: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Vai trò</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => {
                    const r = e.target.value as 'ADMIN' | 'STAFF';
                    setEditingUser({
                      ...editingUser,
                      role: r,
                      roleName: r === 'ADMIN' ? 'Quản lý' : 'Nhân viên',
                    });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="ADMIN">Quản lý (Admin) - Toàn quyền</option>
                  <option value="STAFF">Nhân viên (Staff) - Tác nghiệp</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Mật khẩu đăng nhập</label>
                <input
                  type="text"
                  value={editingUser.password || editingUser.defaultPassword || ''}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      password: e.target.value,
                      defaultPassword: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Ghi chú quyền hạn</label>
                <textarea
                  rows={2}
                  value={editingUser.note || ''}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, note: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-400 bg-slate-800 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD NEW USER */}
      {/* ========================================================================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" /> Thêm Tài Khoản Nhân Sự Mới
              </h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  placeholder="example@ahtcorp.vn"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Tên đăng nhập</label>
                  <input
                    type="text"
                    placeholder="tự động theo email"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Mật khẩu</label>
                  <input
                    type="text"
                    placeholder="mặc định 12345"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Vai trò</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'ADMIN' | 'STAFF')}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="STAFF">Nhân viên (Staff)</option>
                  <option value="ADMIN">Quản lý (Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Ghi chú quyền hạn</label>
                <input
                  type="text"
                  placeholder="Ghi chú phân quyền..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-400 bg-slate-800 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
