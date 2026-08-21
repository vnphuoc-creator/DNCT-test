import React, { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { MaterialCatalogueView } from './components/MaterialCatalogueView';
import { TransactionManagementView } from './components/TransactionManagementView';
import { StockLedgerView } from './components/StockLedgerView';
import { UserManagementView } from './components/UserManagementView';
import { SettingsView } from './components/SettingsView';
import { AiAssistantView } from './components/AiAssistantView';
import { SmartSearchBar } from './components/SmartSearchBar';
import { LoginView } from './components/LoginView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import {
  INITIAL_USERS,
  INITIAL_MATERIALS,
  INITIAL_TRANSACTIONS,
  INITIAL_PROPOSALS,
} from './data/seedData';
import {
  User,
  Material,
  InventoryTransaction,
  PurchaseProposal,
  NaturalSearchFilters,
} from './types';
import { calculateAllMaterialStocks } from './utils/inventoryEngine';
import {
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';

export function App() {
  // Global User State with localStorage persistence
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('smart_users_v6');
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUserId = localStorage.getItem('smart_auth_user_id');
    if (savedUserId) {
      const found = users.find((u) => u.id === savedUserId);
      if (found) return found;
    }
    // Default to the first admin if not set
    return users.find((u) => u.role === 'ADMIN') || users[0];
  });

  // Sync users to localStorage
  React.useEffect(() => {
    localStorage.setItem('smart_users_v6', JSON.stringify(users));
  }, [users]);

  const [materials, setMaterials] = useState<Material[]>(() => {
    const saved = localStorage.getItem('smart_materials_v9');
    if (saved) {
      try {
        const parsed: Material[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= INITIAL_MATERIALS.length) {
          return parsed;
        }
        // Merge missing materials so user gets the full 630+ materials catalog
        const existingCodes = new Set(parsed.map((p) => p.code));
        const missing = INITIAL_MATERIALS.filter((m) => !existingCodes.has(m.code));
        const merged = [...parsed, ...missing];
        if (merged.length >= INITIAL_MATERIALS.length) {
          return merged;
        }
      } catch {
        return INITIAL_MATERIALS;
      }
    }
    return INITIAL_MATERIALS;
  });

  const [proposals, setProposals] = useState<PurchaseProposal[]>(() => {
    const saved = localStorage.getItem('smart_proposals_v2');
    if (saved) {
      try {
        const parsed: PurchaseProposal[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        return INITIAL_PROPOSALS;
      }
    }
    return INITIAL_PROPOSALS;
  });

  const [transactions, setTransactions] = useState<InventoryTransaction[]>(() => {
    const saved = localStorage.getItem('smart_transactions_v6');
    if (saved) {
      try {
        const parsed: InventoryTransaction[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        return INITIAL_TRANSACTIONS;
      }
    }
    return INITIAL_TRANSACTIONS;
  });

  // Navigation & Modal State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSmartSearchOpen, setIsSmartSearchOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<NaturalSearchFilters | null>(null);
  const [filterExplanation, setFilterExplanation] = useState<string | null>(null);
  const [preselectedMaterialCode, setPreselectedMaterialCode] = useState<string | undefined>(undefined);
  const [transactionTypePreset, setTransactionTypePreset] = useState<'IMPORT' | 'EXPORT'>('EXPORT');
  const [transactionStatusFilterPreset, setTransactionStatusFilterPreset] = useState<string | undefined>(undefined);

  // Theme State (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('smart_theme_mode');
    return saved === 'light' ? 'light' : 'dark';
  });

  React.useEffect(() => {
    localStorage.setItem('smart_theme_mode', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light-theme');
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      showToast(
        next === 'light'
          ? 'Đã chuyển sang Giao diện Sáng (Light Theme).'
          : 'Đã chuyển sang Giao diện Tối (Dark Theme).',
        'info'
      );
      return next;
    });
  };

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Sync to local storage
  React.useEffect(() => {
    localStorage.setItem('smart_materials_v9', JSON.stringify(materials));
  }, [materials]);

  React.useEffect(() => {
    localStorage.setItem('smart_transactions_v6', JSON.stringify(transactions));
  }, [transactions]);

  React.useEffect(() => {
    localStorage.setItem('smart_proposals_v2', JSON.stringify(proposals));
  }, [proposals]);

  // Real-time calculated stocks calculation
  const calculatedStocks = useMemo(() => {
    return calculateAllMaterialStocks(materials, transactions);
  }, [materials, transactions]);

  // Handler: Update or Add Proposal
  const handleUpdateProposal = (updatedProposal: PurchaseProposal) => {
    setProposals((prev) => {
      const idx = prev.findIndex((p) => p.id === updatedProposal.id || p.proposalNumber === updatedProposal.proposalNumber);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedProposal;
        return next;
      }
      return [updatedProposal, ...prev];
    });
    showToast(`Đã cập nhật Tờ trình "${updatedProposal.proposalNumber}".`);
  };

  const handleCreateProposal = (newProposal: PurchaseProposal) => {
    setProposals((prev) => [newProposal, ...prev]);
    showToast(`Đã thêm mới Tờ trình "${newProposal.proposalNumber}".`);
  };

  // Login handler
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('smart_auth_user_id', user.id);
    showToast(`Chào mừng ${user.fullName} (${user.role === 'ADMIN' ? 'Quản lý' : 'Nhân viên'}) đăng nhập thành công!`);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('smart_auth_user_id');
    showToast('Đã đăng xuất khỏi hệ thống.', 'info');
  };

  // Handler: Add or Update Material
  const handleSaveMaterial = (materialToSave: Material) => {
    setMaterials((prev) => {
      const idx = prev.findIndex((m) => m.id === materialToSave.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = materialToSave;
        return next;
      } else {
        return [materialToSave, ...prev];
      }
    });
    showToast(`Đã lưu thành công vật tư "${materialToSave.code}" vào danh mục.`);
  };

  // Handler: Delete Material
  const handleDeleteMaterial = (materialId: string) => {
    const mat = materials.find((m) => m.id === materialId);
    setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    showToast(`Đã xóa vật tư "${mat?.code || materialId}" khỏi danh mục.`, 'info');
  };

  // Handler: Create Transaction
  const handleCreateTransaction = (tx: InventoryTransaction) => {
    setTransactions((prev) => [tx, ...prev]);
    if (tx.status === 'APPROVED') {
      showToast(`Đã lập & phê duyệt thành công phiếu "${tx.code}". Số lượng tồn kho đã được cập nhật!`);
    } else {
      showToast(`Đã gửi đề xuất "${tx.code}" lên Quản lý chờ phê duyệt.`, 'info');
    }
  };

  // Handler: Approve Transaction
  const handleApproveTransaction = (txId: string, note?: string) => {
    if (!currentUser) return;
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === txId) {
          return {
            ...t,
            status: 'APPROVED',
            approverEmail: currentUser.email,
            approverName: currentUser.fullName,
            approvalDate: new Date().toISOString().split('T')[0],
            approvalNote: note || 'Quản lý đã phê duyệt',
          };
        }
        return t;
      })
    );
    showToast(`Quản lý ${currentUser.fullName} đã phê duyệt phiếu "${txId}". Tồn kho được cập nhật tức thì!`);
  };

  // Handler: Reject Transaction
  const handleRejectTransaction = (txId: string, note?: string) => {
    if (!currentUser) return;
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === txId) {
          return {
            ...t,
            status: 'REJECTED',
            approverEmail: currentUser.email,
            approverName: currentUser.fullName,
            approvalDate: new Date().toISOString().split('T')[0],
            approvalNote: note || 'Từ chối phê duyệt',
          };
        }
        return t;
      })
    );
    showToast(`Đã từ chối phiếu giao dịch "${txId}".`, 'error');
  };

  // Handler: Open Stock Card
  const handleOpenStockCard = (materialCode: string) => {
    setPreselectedMaterialCode(materialCode);
    setActiveTab('ledger');
  };

  // Handler: Open Transaction creation
  const handleOpenCreateTransaction = (type: 'IMPORT' | 'EXPORT', preselectedCode?: string) => {
    setTransactionTypePreset(type);
    setPreselectedMaterialCode(preselectedCode);
    setActiveTab('transactions');
  };

  // Handler: Navigation with filter from Dashboard
  const handleDashboardNavigate = (tab: string, filter?: string) => {
    if (tab === 'materials' && filter) {
      setAppliedFilters({ stockStatus: filter as any });
      setFilterExplanation(
        filter === 'LOW_STOCK'
          ? 'Danh sách các vật tư dưới mức tồn an toàn (≤ Min)'
          : `Lọc theo trạng thái ${filter}`
      );
    } else if (tab === 'transactions' && filter) {
      setTransactionStatusFilterPreset(filter);
    }
    setActiveTab(tab);
  };

  // Handler: Natural language search result application
  const handleApplyNaturalFilters = (
    filters: NaturalSearchFilters,
    explanation: string,
    targetTab: string = 'materials'
  ) => {
    setAppliedFilters(filters);
    setFilterExplanation(explanation);
    setActiveTab(targetTab);
    showToast(`Đã áp dụng kết quả tìm kiếm AI: ${explanation}`, 'info');
  };

  const handleClearFilters = () => {
    setAppliedFilters(null);
    setFilterExplanation(null);
  };

  // User Management Handlers
  const handleUpdateUser = (updatedUser: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    showToast(`Đã cập nhật phân quyền cho: ${updatedUser.fullName}!`);
  };

  const handleAddUser = (newUser: User) => {
    setUsers((prev) => [...prev, newUser]);
    showToast(`Đã tạo tài khoản nhân sự mới: ${newUser.fullName}!`);
  };

  // If not logged in, display LoginView
  if (!currentUser) {
    return <LoginView users={users} onLogin={handleLogin} />;
  }

  const pendingApprovalsCount = transactions.filter((t) => t.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white font-sans">
      {/* Vertical Sidebar Navigation (Fixed on left for lg screens) */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setPreselectedMaterialCode(undefined);
          setTransactionStatusFilterPreset(undefined);
        }}
        pendingApprovalsCount={pendingApprovalsCount}
        onLogout={handleLogout}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onToggleMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main Content Column with Header Bar */}
      <div className="lg:pl-72 flex flex-col min-h-screen app-root-container">
        {/* Top Header Bar */}
        <Navbar
          currentUser={currentUser}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setPreselectedMaterialCode(undefined);
            setTransactionStatusFilterPreset(undefined);
          }}
          pendingApprovalsCount={pendingApprovalsCount}
          onOpenAiSearch={() => setIsSmartSearchOpen(true)}
          onLogout={handleLogout}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Main View Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5">
          {activeTab === 'dashboard' && (
            <DashboardView
              currentUser={currentUser}
              calculatedStocks={calculatedStocks}
              transactions={transactions}
              onNavigateTab={handleDashboardNavigate}
              onOpenCreateTransaction={handleOpenCreateTransaction}
              onApproveTransaction={handleApproveTransaction}
              onRejectTransaction={handleRejectTransaction}
              onOpenStockCard={handleOpenStockCard}
            />
          )}

          {activeTab === 'materials' && (
            <MaterialCatalogueView
              currentUser={currentUser}
              allUsers={users}
              materials={materials}
              calculatedStocks={calculatedStocks}
              onSaveMaterial={handleSaveMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onOpenStockCard={handleOpenStockCard}
              onOpenCreateTransaction={handleOpenCreateTransaction}
              appliedFilters={appliedFilters}
              filterExplanation={filterExplanation}
              onClearFilters={handleClearFilters}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionManagementView
              currentUser={currentUser}
              allUsers={users}
              materials={materials}
              calculatedStocks={calculatedStocks}
              transactions={transactions}
              proposals={proposals}
              onUpdateProposal={handleUpdateProposal}
              onCreateProposal={handleCreateProposal}
              onCreateTransaction={handleCreateTransaction}
              onApproveTransaction={handleApproveTransaction}
              onRejectTransaction={handleRejectTransaction}
              initialType={transactionTypePreset}
              initialStatusFilter={transactionStatusFilterPreset}
              preselectedMaterialCode={preselectedMaterialCode}
            />
          )}

          {activeTab === 'ledger' && (
            <StockLedgerView
              materials={materials}
              calculatedStocks={calculatedStocks}
              transactions={transactions}
              initialMaterialCode={preselectedMaterialCode}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView
              currentUser={currentUser}
              allUsers={users}
              onSelectUser={(u) => {
                setCurrentUser(u);
                localStorage.setItem('smart_auth_user_id', u.id);
                showToast(`Đã chuyển phiên làm việc sang: ${u.fullName}`);
              }}
              onUpdateUser={handleUpdateUser}
              onAddUser={handleAddUser}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              allUsers={users}
              materials={materials}
              transactions={transactions}
              onUpdateMaterials={(newMats) => {
                setMaterials(newMats);
                showToast(`Đã cập nhật danh mục gồm ${newMats.length} vật tư.`);
              }}
              onUpdateUsers={(newUsers) => {
                setUsers(newUsers);
                showToast(`Đã cập nhật danh sách người dùng.`);
              }}
            />
          )}

          {activeTab === 'ai' && (
            <AiAssistantView
              currentUser={currentUser}
              materials={materials}
              calculatedStocks={calculatedStocks}
              transactions={transactions}
              proposals={proposals}
              onOpenCreateTransaction={handleOpenCreateTransaction}
              onOpenStockCard={handleOpenStockCard}
            />
          )}
        </main>
      </div>

      {/* Natural Language AI Search Modal */}
      <SmartSearchBar
        isOpen={isSmartSearchOpen}
        onClose={() => setIsSmartSearchOpen(false)}
        onApplyFilters={handleApplyNaturalFilters}
        materials={materials}
        transactions={transactions}
      />

      {/* Change Password Modal for Current User */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        onSuccessToast={(msg) => showToast(msg, 'success')}
      />

      {/* Global Toast Alerts */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'success'
              ? 'bg-slate-900 border-emerald-500/50 text-emerald-300'
              : toast.type === 'error'
              ? 'bg-slate-900 border-rose-500/50 text-rose-300'
              : 'bg-slate-900 border-blue-500/50 text-blue-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
          )}
          <span className="text-xs font-medium flex-1 text-slate-100">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
