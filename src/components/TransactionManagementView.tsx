import React, { useState, useMemo } from 'react';
import {
  ArrowRightLeft,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Plus,
  Check,
  XCircle,
  Clock,
  Printer,
  Eye,
  FileText,
  Trash2,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  X,
  PlusCircle,
  FileSpreadsheet,
  FileCheck,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  InventoryTransaction,
  TransactionType,
  TransactionStatus,
  TransactionItem,
  Material,
  CalculatedMaterialStock,
  User,
  PurchaseProposal,
} from '../types';
import { formatVND, formatNumber, formatDisplayDate } from '../utils/inventoryEngine';
import { AHTLogo } from './AHTLogo';
import { ProposalReconciliationView } from './ProposalReconciliationView';

interface TransactionManagementViewProps {
  currentUser: User;
  allUsers: User[];
  materials: Material[];
  calculatedStocks: CalculatedMaterialStock[];
  transactions: InventoryTransaction[];
  proposals?: PurchaseProposal[];
  onCreateTransaction: (transaction: InventoryTransaction) => void;
  onApproveTransaction: (txId: string, note?: string) => void;
  onRejectTransaction: (txId: string, note?: string) => void;
  onUpdateProposal?: (proposal: PurchaseProposal) => void;
  onCreateProposal?: (proposal: PurchaseProposal) => void;
  initialType?: 'IMPORT' | 'EXPORT';
  initialStatusFilter?: string;
  preselectedMaterialCode?: string;
}

export const TransactionManagementView: React.FC<TransactionManagementViewProps> = ({
  currentUser,
  allUsers,
  materials,
  calculatedStocks,
  transactions,
  proposals = [],
  onCreateTransaction,
  onApproveTransaction,
  onRejectTransaction,
  onUpdateProposal,
  onCreateProposal,
  initialType,
  initialStatusFilter,
  preselectedMaterialCode,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'IMPORT' | 'EXPORT' | 'PROPOSALS'>(
    initialStatusFilter === 'PENDING' ? 'PENDING' : 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTxForView, setSelectedTxForView] = useState<InventoryTransaction | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Approval Modal state
  const [approvingTx, setApprovingTx] = useState<InventoryTransaction | null>(null);
  const [approvalNote, setApprovalNote] = useState('Đã kiểm tra chứng từ & phê duyệt nhập/xuất kho.');
  const [rejectingTx, setRejectingTx] = useState<InventoryTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('Số lượng chưa hợp lệ hoặc thiếu chứng từ đính kèm.');

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formType, setFormType] = useState<TransactionType>(initialType || 'EXPORT');
  const [formProposalNumber, setFormProposalNumber] = useState('17-DNCT/PKT');
  const [formTitle, setFormTitle] = useState('');
  const [formPartner, setFormPartner] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('Kho Tổng');
  const [formReason, setFormReason] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAttachmentName, setFormAttachmentName] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [isScanningProposal, setIsScanningProposal] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [formItems, setFormItems] = useState<
    Array<{
      materialCode: string;
      quantity: number;
      unitPrice: number;
      notes: string;
    }>
  >([]);

  // Open create modal with prefilled data if requested
  React.useEffect(() => {
    if (preselectedMaterialCode) {
      const mat = materials.find((m) => m.code === preselectedMaterialCode);
      if (mat) {
        setFormType(initialType || 'EXPORT');
        setFormProposalNumber('17-DNCT/PKT');
        setFormTitle(
          initialType === 'IMPORT'
            ? `Đề xuất nhập bổ sung ${mat.name}`
            : `Đề xuất xuất vật tư ${mat.name}`
        );
        setFormItems([
          {
            materialCode: mat.code,
            quantity: 1,
            unitPrice: mat.unitPrice,
            notes: '',
          },
        ]);
        setIsCreateModalOpen(true);
      }
    }
  }, [preselectedMaterialCode, initialType, materials]);

  const openNewTransactionModal = (type: TransactionType = 'EXPORT') => {
    setFormType(type);
    setFormProposalNumber(type === 'IMPORT' ? '17-DNCT/PKT' : '');
    setFormTitle(
      type === 'IMPORT'
        ? 'Phiếu đề nghị nhập kho vật tư'
        : 'Phiếu đề nghị xuất vật tư thi công'
    );
    setFormPartner('');
    setFormWarehouse('Kho Tổng');
    setFormReason(
      type === 'IMPORT'
        ? 'Nhập kho phục vụ công tác bảo trì theo Tờ trình'
        : 'Cấp phát vật tư phục vụ công trình'
    );
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormAttachmentName('');
    setFormAttachmentUrl('');
    setScanFeedback(null);
    setIsScanningProposal(false);

    const defaultMat = materials[0];
    setFormItems([
      {
        materialCode: defaultMat ? defaultMat.code : '',
        quantity: 5,
        unitPrice: defaultMat ? defaultMat.unitPrice : 0,
        notes: '',
      },
    ]);
    setIsCreateModalOpen(true);
  };

  // Helper: Start import directly from a Proposal
  const handleStartImportForProposal = (
    proposal: PurchaseProposal,
    missingItems: Array<{ materialCode: string; missingQty: number; unitPrice: number }>
  ) => {
    setFormType('IMPORT');
    setFormProposalNumber(proposal.proposalNumber);
    setFormTitle(`Phiếu nhập kho theo Tờ trình ${proposal.proposalNumber}`);
    setFormPartner('Công ty Cổ Phần Ống Nhựa & Thiết Bị Điện Nước');
    setFormWarehouse('Kho Tổng');
    setFormReason(`Nhập vật tư theo Tờ trình ${proposal.proposalNumber} đã được Quản lý phê duyệt`);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormAttachmentName(proposal.attachmentName || '');
    setFormAttachmentUrl(proposal.attachmentUrl || '');

    if (missingItems && missingItems.length > 0) {
      setFormItems(
        missingItems.map((item) => ({
          materialCode: item.materialCode,
          quantity: item.missingQty,
          unitPrice: item.unitPrice,
          notes: `Nhập bổ sung theo Tờ trình ${proposal.proposalNumber}`,
        }))
      );
    } else {
      setFormItems(
        proposal.items.map((item) => ({
          materialCode: item.materialCode,
          quantity: item.requestedQuantity,
          unitPrice: item.unitPrice || 0,
          notes: `Nhập theo Tờ trình ${proposal.proposalNumber}`,
        }))
      );
    }
    setIsCreateModalOpen(true);
  };

  // Helper: Live proposal match check in Create Modal
  const matchedProposal = useMemo(() => {
    if (!formProposalNumber.trim()) return null;
    return proposals.find(
      (p) => p.proposalNumber.trim().toLowerCase() === formProposalNumber.trim().toLowerCase()
    );
  }, [proposals, formProposalNumber]);

  // Check how much is already imported for this matched proposal
  const matchedProposalProgress = useMemo(() => {
    if (!matchedProposal) return null;
    const relatedTxs = transactions.filter(
      (tx) =>
        tx.type === 'IMPORT' &&
        tx.status !== 'REJECTED' &&
        tx.proposalNumber &&
        tx.proposalNumber.trim().toLowerCase() === matchedProposal.proposalNumber.trim().toLowerCase()
    );

    const importedMap = new Map<string, number>();
    relatedTxs.forEach((tx) => {
      tx.items.forEach((item) => {
        const current = importedMap.get(item.materialCode) || 0;
        importedMap.set(item.materialCode, current + (Number(item.quantity) || 0));
      });
    });

    let totalReq = 0;
    let totalImp = 0;
    const missing: Array<{ materialCode: string; missingQty: number; unitPrice: number; name: string }> = [];

    matchedProposal.items.forEach((item) => {
      const imp = importedMap.get(item.materialCode) || 0;
      const req = Number(item.requestedQuantity) || 0;
      totalReq += req;
      totalImp += Math.min(req, imp);
      if (imp < req) {
        missing.push({
          materialCode: item.materialCode,
          missingQty: req - imp,
          unitPrice: item.unitPrice || 0,
          name: item.materialName,
        });
      }
    });

    const percent = totalReq > 0 ? Math.min(100, Math.round((totalImp / totalReq) * 100)) : 100;
    const isComplete = percent >= 100 && missing.length === 0;

    return {
      totalReq,
      totalImp,
      percent,
      isComplete,
      missing,
      txCount: relatedTxs.length,
    };
  }, [matchedProposal, transactions]);

  // Auto-fill missing items from matched proposal
  const handleAutoFillMissingItems = () => {
    if (!matchedProposalProgress || matchedProposalProgress.missing.length === 0) return;
    setFormItems(
      matchedProposalProgress.missing.map((m) => ({
        materialCode: m.materialCode,
        quantity: m.missingQty,
        unitPrice: m.unitPrice,
        notes: `Nhập bổ sung phần còn thiếu theo Tờ trình ${formProposalNumber}`,
      }))
    );
  };

  // Handle scanning and parsing proposal file to auto-fill import voucher
  const handleScanProposalFile = async (file: File) => {
    setIsScanningProposal(true);
    setScanFeedback('Đang quét và nhận diện thông tin tờ trình...');
    setFormAttachmentName(file.name);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setFormAttachmentUrl(dataUrl);

      try {
        const res = await fetch('/api/ai/scan-proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: dataUrl,
            fileName: file.name,
            availableMaterials: materials.slice(0, 100).map((m) => ({
              code: m.code,
              name: m.name,
              unit: m.unit,
              unitPrice: m.unitPrice,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.proposalNumber) setFormProposalNumber(data.proposalNumber);
          if (data.title) setFormTitle(data.title);
          if (data.partner) setFormPartner(data.partner);
          if (data.reason) setFormReason(data.reason);
          if (Array.isArray(data.items) && data.items.length > 0) {
            const mapped = data.items.map((it: any) => {
              const match =
                materials.find((m) => m.code === it.materialCode) ||
                materials.find((m) => m.name.toLowerCase().includes((it.materialName || '').toLowerCase())) ||
                materials[0];
              return {
                materialCode: match ? match.code : materials[0].code,
                quantity: Number(it.quantity) || 1,
                unitPrice: Number(it.unitPrice) || (match ? match.unitPrice : 0),
                notes: it.notes || `Tự động quét từ Tờ trình ${data.proposalNumber || ''}`,
              };
            });
            setFormItems(mapped);
            setScanFeedback(`✨ Quét thành công! Đã tự động điền Tờ trình "${data.proposalNumber}" và ${mapped.length} mặt hàng.`);
          } else {
            setScanFeedback(`✨ Đã nhận diện Tờ trình "${data.proposalNumber}".`);
          }
        } else {
          setScanFeedback('Đã đính kèm tệp tờ trình.');
        }
      } catch {
        setScanFeedback('Đã đính kèm tệp tờ trình.');
      } finally {
        setIsScanningProposal(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle file upload for attachment
  const handleTransactionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (formType === 'IMPORT') {
        handleScanProposalFile(file);
      } else {
        setFormAttachmentName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormAttachmentUrl(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleAddItemRow = () => {
    const defaultMat = materials[0];
    setFormItems([
      ...formItems,
      {
        materialCode: defaultMat ? defaultMat.code : '',
        quantity: 1,
        unitPrice: defaultMat ? defaultMat.unitPrice : 0,
        notes: '',
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: 'materialCode' | 'quantity' | 'unitPrice' | 'notes',
    value: any
  ) => {
    const updated = [...formItems];
    if (field === 'materialCode') {
      const mat = materials.find((m) => m.code === value);
      updated[index] = {
        ...updated[index],
        materialCode: value,
        unitPrice: mat ? mat.unitPrice : updated[index].unitPrice,
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setFormItems(updated);
  };

  // Submit Transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0) {
      alert('Vui lòng thêm ít nhất một vật tư vào phiếu.');
      return;
    }

    // Prepare items with full metadata
    const preparedItems: TransactionItem[] = formItems.map((item) => {
      const matStock = calculatedStocks.find((m) => m.code === item.materialCode);
      const mat = materials.find((m) => m.code === item.materialCode);
      const qty = Math.max(1, Number(item.quantity) || 1);
      const price = Number(item.unitPrice) || mat?.unitPrice || 0;

      return {
        materialCode: item.materialCode,
        materialName: mat?.name || 'Vật tư',
        unit: mat?.unit || 'Cái',
        quantity: qty,
        unitPrice: price,
        totalAmount: qty * price,
        currentStockAtCreation: matStock?.currentStock || 0,
        notes: item.notes,
        proposalNumber: formProposalNumber.trim() || undefined,
      };
    });

    const totalQty = preparedItems.reduce((sum, i) => sum + i.quantity, 0);
    const totalAmt = preparedItems.reduce((sum, i) => sum + i.totalAmount, 0);

    // If currentUser is Admin, they can auto-approve or create as approved
    const isAutoApprove = currentUser.role === 'ADMIN';
    const dateNum = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const prefix = formType === 'IMPORT' ? 'PN' : 'PX';
    const code = isAutoApprove
      ? `${prefix}-${dateNum}-${Math.floor(100 + Math.random() * 900)}`
      : `DN-${dateNum}-${Math.floor(100 + Math.random() * 900)}`;

    const newTx: InventoryTransaction = {
      id: `tx-${Date.now()}`,
      code,
      proposalNumber: formProposalNumber.trim() || undefined,
      type: formType,
      title: formTitle.trim() || `${formType === 'IMPORT' ? 'Phiếu Nhập' : 'Phiếu Xuất'} ${code}`,
      date: formDate,
      creatorEmail: currentUser.email,
      creatorName: currentUser.fullName,
      creatorRole: currentUser.role,
      partner: formPartner.trim() || 'Nội bộ',
      warehouse: formWarehouse,
      status: isAutoApprove ? 'APPROVED' : 'PENDING',
      items: preparedItems,
      totalQuantity: totalQty,
      totalAmount: totalAmt,
      reason: formReason,
      attachmentName: formAttachmentName || undefined,
      attachmentUrl: formAttachmentUrl || undefined,
      attachmentType: formAttachmentName.endsWith('.pdf') ? 'pdf' : 'image',
      ...(isAutoApprove && {
        approverEmail: currentUser.email,
        approverName: currentUser.fullName,
        approvalDate: formDate,
        approvalNote: 'Quản lý duyệt tự động khi tạo phiếu',
      }),
      createdAt: new Date().toISOString(),
    };

    onCreateTransaction(newTx);
    setIsCreateModalOpen(false);

    if (isAutoApprove) {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {
        // ignore
      }
    }
  };

  const handleConfirmApproval = () => {
    if (!approvingTx) return;
    onApproveTransaction(approvingTx.id, approvalNote);
    try {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    } catch {
      // ignore
    }
    setApprovingTx(null);
  };

  const handleConfirmRejection = () => {
    if (!rejectingTx) return;
    onRejectTransaction(rejectingTx.id, rejectReason);
    setRejectingTx(null);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (activeTab === 'PENDING' && tx.status !== 'PENDING') return false;
      if (activeTab === 'IMPORT' && tx.type !== 'IMPORT') return false;
      if (activeTab === 'EXPORT' && tx.type !== 'EXPORT') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = tx.code.toLowerCase().includes(q);
        const matchProposal = tx.proposalNumber ? tx.proposalNumber.toLowerCase().includes(q) : false;
        const matchTitle = tx.title.toLowerCase().includes(q);
        const matchPartner = tx.partner.toLowerCase().includes(q);
        const matchCreator = tx.creatorName.toLowerCase().includes(q);
        const matchItems = tx.items.some(
          (i) => i.materialCode.toLowerCase().includes(q) || i.materialName.toLowerCase().includes(q)
        );
        if (!matchCode && !matchProposal && !matchTitle && !matchPartner && !matchCreator && !matchItems) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, activeTab, searchQuery]);

  const pendingCount = transactions.filter((t) => t.status === 'PENDING').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header and top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Quản Lý Nghiệp Vụ Xuất - Nhập - Tồn
            </h1>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {transactions.length} chứng từ
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Quy trình chuẩn: Tạo phiếu &rarr; Phê duyệt (Chỉ Quản lý) &rarr; Tự động cộng/trừ hàng tồn kho
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-create-export-tx"
            onClick={() => openNewTransactionModal('EXPORT')}
            className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{currentUser.role === 'ADMIN' ? '+ Phiếu Xuất Kho' : '+ Đề Xuất Xuất'}</span>
          </button>
          <button
            id="btn-create-import-tx"
            onClick={() => openNewTransactionModal('IMPORT')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-600/30"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>{currentUser.role === 'ADMIN' ? '+ Phiếu Nhập Kho' : '+ Đề Xuất Nhập'}</span>
          </button>
        </div>
      </div>

      {/* Tabs and search bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status/Type Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất Cả ({transactions.length})
            </button>
            <button
              id="tab-pending-transactions"
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chờ Phê Duyệt</span>
              {pendingCount > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('IMPORT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'IMPORT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-blue-400" />
              <span>Phiếu Nhập (PN)</span>
            </button>
            <button
              onClick={() => setActiveTab('EXPORT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
                activeTab === 'EXPORT'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
              <span>Phiếu Xuất (PX)</span>
            </button>
            <button
              id="tab-proposals-reconciliation"
              onClick={() => setActiveTab('PROPOSALS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'PROPOSALS'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'text-indigo-300 hover:text-white bg-indigo-950/40 border border-indigo-700/50'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Đối Chiếu Tờ Trình ({proposals.length})</span>
            </button>
          </div>

          {/* Search Box */}
          {activeTab !== 'PROPOSALS' && (
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo mã phiếu, vật tư, đối tác..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content: Proposal Reconciliation View or Transactions Table */}
      {activeTab === 'PROPOSALS' ? (
        <ProposalReconciliationView
          currentUser={currentUser}
          materials={materials}
          transactions={transactions}
          proposals={proposals}
          onStartImportForProposal={handleStartImportForProposal}
          onUpdateProposal={onUpdateProposal}
          onCreateProposal={onCreateProposal}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-850 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Mã Chứng Từ</th>
                <th className="py-3.5 px-3">Số Tờ Trình</th>
                <th className="py-3.5 px-3">Loại Phiếu</th>
                <th className="py-3.5 px-4 min-w-[220px]">Diễn Giải / Tên Phiếu</th>
                <th className="py-3.5 px-3">Đối Tác / Đơn Vị Nhận</th>
                <th className="py-3.5 px-3">Ngày Lập</th>
                <th className="py-3.5 px-3">Người Lập</th>
                <th className="py-3.5 px-3 text-right">Tổng SL</th>
                <th className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                  Tổng Tiền
                </th>
                <th className="py-3.5 px-3 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    Không tìm thấy chứng từ nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/60 transition-colors">
                    {/* Code */}
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                        {tx.code}
                      </span>
                    </td>

                    {/* Proposal Number */}
                    <td className="py-3 px-3">
                      {tx.proposalNumber ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-950/70 text-blue-300 border border-blue-700/60 shadow-sm">
                          {tx.proposalNumber}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">-</span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3 px-3">
                      {tx.type === 'IMPORT' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                          <ArrowDownRight className="w-3 h-3" /> Nhập kho
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                          <ArrowUpRight className="w-3 h-3" /> Xuất kho
                        </span>
                      )}
                    </td>

                    {/* Title & Items Summary */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white text-xs">{tx.title}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                        {tx.items.map((i) => `${i.materialCode} (${i.quantity} ${i.unit})`).join(', ')}
                      </div>
                    </td>

                    {/* Partner */}
                    <td className="py-3 px-3 text-slate-300 text-[11px] truncate max-w-[150px]">
                      {tx.partner}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {tx.date}
                    </td>

                    {/* Creator (No email) */}
                    <td className="py-3 px-3">
                      <div className="text-white text-[11px] font-medium">{tx.creatorName}</div>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-200">
                      {formatNumber(tx.totalQuantity)}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                      {formatVND(tx.totalAmount)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      {tx.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Đã duyệt
                        </span>
                      )}
                      {tx.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium animate-pulse">
                          <Clock className="w-3 h-3" /> Chờ duyệt
                        </span>
                      )}
                      {tx.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-medium">
                          <XCircle className="w-3 h-3" /> Từ chối
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`btn-view-voucher-${tx.id}`}
                          onClick={() => setSelectedTxForView(tx)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Xem & In Phiếu Kế Toán"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                        </button>

                        {/* Approval buttons for Admin if Pending */}
                        {currentUser.role === 'ADMIN' && tx.status === 'PENDING' && (
                          <>
                            <button
                              id={`btn-approve-tx-${tx.id}`}
                              onClick={() => setApprovingTx(tx)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-sm"
                            >
                              <Check className="w-3 h-3" /> Duyệt
                            </button>
                            <button
                              id={`btn-reject-tx-${tx.id}`}
                              onClick={() => setRejectingTx(tx)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-[11px] font-medium flex items-center gap-1 transition-colors"
                            >
                              <XCircle className="w-3 h-3" /> Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Modal: Create Transaction / Voucher */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg ${
                    formType === 'IMPORT' ? 'bg-blue-600/20 text-blue-400' : 'bg-amber-600/20 text-amber-400'
                  } flex items-center justify-center`}
                >
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {currentUser.role === 'ADMIN'
                      ? formType === 'IMPORT'
                        ? 'Lập Phiếu Nhập Kho Vật Tư'
                        : 'Lập Phiếu Xuất Kho Vật Tư'
                      : formType === 'IMPORT'
                      ? 'Lập Đề Xuất Nhập Kho (Chờ Duyệt)'
                      : 'Lập Đề Xuất Xuất Kho (Chờ Duyệt)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Người lập: <strong className="text-slate-200">{currentUser.fullName}</strong> ({currentUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveTransaction} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Type Switcher & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-850 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Loại Nghiệp Vụ</label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-800 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setFormType('IMPORT')}
                      className={`py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                        formType === 'IMPORT' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" /> Nhập Kho
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('EXPORT')}
                      className={`py-1.5 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                        formType === 'EXPORT' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" /> Xuất Kho
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Ngày Chứng Từ</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Kho Thực Hiện</label>
                  <input
                    type="text"
                    value={formWarehouse}
                    onChange={(e) => setFormWarehouse(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Title & Partner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Tiêu Đề / Diễn Giải <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: Xuất cáp điện thi công tuyến 2..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {formType === 'IMPORT' ? 'Nhà Cung Cấp / Đối Tác' : 'Đơn Vị Nhận / Công Trình'}{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPartner}
                    onChange={(e) => setFormPartner(e.target.value)}
                    placeholder={
                      formType === 'IMPORT'
                        ? 'Tên nhà cung ứng vật tư...'
                        : 'Tên tổ thi công, công trình, dự án...'
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Import vs Export Specific Inputs */}
              {formType === 'IMPORT' ? (
                <div className="space-y-4">
                  {/* AI Proposal Scanner & Auto-Fill Dropzone */}
                  <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/30 border border-blue-800/40 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-blue-200">
                          Quét File / Ảnh Tờ Trình Để Tự Động Điền
                        </span>
                      </div>
                      {isScanningProposal && (
                        <span className="text-[11px] text-amber-300 animate-pulse flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Đang nhận diện tờ trình...
                        </span>
                      )}
                    </div>
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900/80 hover:bg-slate-800/80 border border-dashed border-blue-500/50 rounded-xl cursor-pointer text-blue-300 hover:text-white text-xs transition-colors">
                      <Upload className="w-4 h-4 text-blue-400" />
                      <span>Nhấp để tải lên hoặc kéo thả File/Ảnh Tờ Trình (PDF, PNG, JPG, TXT)</span>
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleScanProposalFile(f);
                        }}
                        className="hidden"
                      />
                    </label>
                    {scanFeedback && (
                      <div className="text-xs text-emerald-300 font-medium bg-emerald-950/40 border border-emerald-800/50 rounded-lg p-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{scanFeedback}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Số Tờ Trình Đề Xuất
                      </label>
                      <input
                        type="text"
                        value={formProposalNumber}
                        onChange={(e) => setFormProposalNumber(e.target.value)}
                        placeholder="Ví dụ: 17-DNCT/PKT, 26-DNCT/PKT..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-blue-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Lý Do Nhập Kho</label>
                      <input
                        type="text"
                        value={formReason}
                        onChange={(e) => setFormReason(e.target.value)}
                        placeholder="Mục đích sử dụng, căn cứ hợp đồng hoặc tờ trình..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Lý Do Xuất Kho</label>
                  <input
                    type="text"
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="Mục đích xuất vật tư, công trình thi công hoặc kế hoạch bảo dưỡng..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Proposal Document / Image Attachment (Optional - "phần import này không bắt buộc") */}
              <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    File hoặc Ảnh Tờ Trình Đính Kèm{' '}
                    <span className="text-slate-500 font-normal text-[11px]">(Không bắt buộc)</span>
                  </label>
                  {formAttachmentUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormAttachmentName('');
                        setFormAttachmentUrl('');
                      }}
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa tệp đính kèm
                    </button>
                  )}
                </div>

                {formAttachmentUrl ? (
                  <div className="flex items-center justify-between p-2 bg-slate-800/80 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {formAttachmentUrl.startsWith('data:image') || formAttachmentUrl.includes('images.unsplash') ? (
                        <img
                          src={formAttachmentUrl}
                          alt="Đính kèm"
                          className="w-9 h-9 object-cover rounded border border-slate-600 cursor-pointer"
                          onClick={() => setLightboxImage(formAttachmentUrl)}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-blue-900/40 border border-blue-600 flex items-center justify-center text-blue-400">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      <div className="truncate">
                        <div className="text-xs font-medium text-slate-200 truncate max-w-xs">
                          {formAttachmentName || 'Tờ trình đính kèm'}
                        </div>
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đã sẵn sàng lưu cùng phiếu
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLightboxImage(formAttachmentUrl)}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium rounded transition-colors shrink-0"
                    >
                      Xem phóng to
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-dashed border-slate-700 rounded-xl cursor-pointer text-slate-400 hover:text-slate-200 text-xs transition-colors">
                      <Upload className="w-4 h-4 text-blue-400" />
                      <span>Chọn ảnh hoặc file PDF tờ trình (Tùy chọn)</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleTransactionFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Real-time Proposal Reconciliation Banner */}
              {formType === 'IMPORT' && matchedProposal && matchedProposalProgress && (
                <div
                  className={`p-3 rounded-xl border text-xs ${
                    matchedProposalProgress.isComplete
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                      : 'bg-indigo-950/40 border-indigo-700/60 text-indigo-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {matchedProposalProgress.isComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-white">
                          Đối chiếu với Tờ trình: {matchedProposal.proposalNumber} - {matchedProposal.title}
                        </div>
                        <div className="text-[11px] opacity-90 mt-0.5">
                          {matchedProposalProgress.isComplete ? (
                            <span className="text-emerald-300 font-medium">
                              ✔ Tờ trình này đã nhập đủ 100% số lượng ({matchedProposalProgress.totalImp}/{matchedProposalProgress.totalReq} vật tư qua {matchedProposalProgress.txCount} lần nhập).
                            </span>
                          ) : (
                            <span>
                              Tiến độ: <strong>{matchedProposalProgress.percent}%</strong> ({matchedProposalProgress.totalImp}/{matchedProposalProgress.totalReq} vật tư). Còn thiếu {matchedProposalProgress.missing.length} mặt hàng.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!matchedProposalProgress.isComplete && matchedProposalProgress.missing.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoFillMissingItems}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        Nạp các vật tư còn thiếu ({matchedProposalProgress.missing.length})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Items Table Section */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
                    Danh Sách Vật Tư Thuộc Phiếu (Mã DN_*)
                  </span>
                  <button
                    type="button"
                    id="btn-add-item-row"
                    onClick={handleAddItemRow}
                    className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + Thêm dòng vật tư
                  </button>
                </div>

                <div className="bg-slate-850 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Vật Tư (Mã DN_*)</th>
                        <th className="py-2.5 px-2 text-center">Tồn Hiện Tại</th>
                        <th className="py-2.5 px-3 text-right">Số Lượng</th>
                        <th className="py-2.5 px-3 text-right">Đơn Giá (VNĐ)</th>
                        <th className="py-2.5 px-3 text-right">Thành Tiền</th>
                        <th className="py-2.5 px-2 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {formItems.map((item, idx) => {
                        const matStock = calculatedStocks.find((m) => m.code === item.materialCode);
                        const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                        const isExceedStock =
                          formType === 'EXPORT' && matStock && item.quantity > matStock.currentStock;

                        return (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            {/* Material Select */}
                            <td className="py-2.5 px-3">
                              <select
                                value={item.materialCode}
                                onChange={(e) => handleItemChange(idx, 'materialCode', e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                              >
                                {materials.map((m) => (
                                  <option key={m.code} value={m.code}>
                                    {m.code} - {m.name} ({m.unit})
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Current Stock info */}
                            <td className="py-2.5 px-2 text-center font-mono text-[11px]">
                              {matStock ? (
                                <span
                                  className={
                                    matStock.currentStock <= 0 ? 'text-rose-400' : 'text-emerald-400'
                                  }
                                >
                                  {matStock.currentStock} {matStock.unit}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>

                            {/* Quantity input */}
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    'quantity',
                                    Math.max(1, parseInt(e.target.value) || 1)
                                  )
                                }
                                className={`w-20 bg-slate-800 border ${
                                  isExceedStock ? 'border-rose-500 text-rose-300' : 'border-slate-700 text-white'
                                } rounded-lg px-2 py-1 text-right font-mono focus:outline-none`}
                              />
                              {isExceedStock && (
                                <div className="text-[10px] text-rose-400 font-sans mt-0.5">
                                  Vượt quá tồn kho ({matStock?.currentStock})
                                </div>
                              )}
                            </td>

                            {/* Unit Price */}
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    'unitPrice',
                                    Math.max(0, parseInt(e.target.value) || 0)
                                  )
                                }
                                className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right font-mono text-white focus:outline-none"
                              />
                            </td>

                            {/* Row Total */}
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">
                              {formatVND(rowTotal)}
                            </td>

                            {/* Delete row */}
                            <td className="py-2.5 px-2 text-center">
                              {formItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(idx)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-900 font-semibold text-xs border-t border-slate-800">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-slate-300">
                          Tổng Cộng:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-white">
                          {formatNumber(formItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0))}
                        </td>
                        <td></td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400 text-sm">
                          {formatVND(
                            formItems.reduce(
                              (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
                              0
                            )
                          )}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  {currentUser.role === 'ADMIN' ? (
                    <span className="text-emerald-400">
                      ✔ Bạn có quyền Quản lý: Phiếu sẽ được phê duyệt & cập nhật kho ngay lập tức.
                    </span>
                  ) : (
                    <span className="text-amber-400">
                      ⏳ Quyền Nhân viên: Phiếu sẽ được gửi lên Ban Quản lý chờ xét duyệt.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-tx-form"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
                  >
                    {currentUser.role === 'ADMIN' ? 'Lập Phiếu & Duyệt Kho' : 'Gửi Đề Xuất Phê Duyệt'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View / Print Voucher (Phiếu Kho Chuẩn Kế Toán) */}
      {selectedTxForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="no-print p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Chứng Từ Kho Hàng Số: {selectedTxForView.code}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5" /> In Chứng Từ
                </button>
                <button
                  onClick={() => setSelectedTxForView(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Voucher Document Print Body */}
            <div className="printable-area p-6 overflow-y-auto bg-white text-slate-900 print:p-0 font-sans space-y-4">
              <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                <div className="flex items-center gap-3">
                  <AHTLogo className="h-10" showPlane={false} allowUpload={false} />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-blue-950 uppercase tracking-tight">
                      CÔNG TY CỔ PHẦN ĐẦU TƯ KHAI THÁC NHÀ GA QUỐC TẾ ĐÀ NẴNG
                    </h4>
                    <p className="text-xs font-semibold text-slate-700">Đội Điện Nước Công Trình (DOIDNCT)</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-slate-700 font-mono">Mẫu số: 01-VT</div>
                  <div className="text-[11px] text-slate-500">Ban hành theo Thông tư 99/2025/TT-BTC</div>
                  <div className="text-xs font-bold text-blue-800 mt-1 font-mono">Số: {selectedTxForView.code}</div>
                  {selectedTxForView.type === 'IMPORT' && selectedTxForView.proposalNumber && (
                    <div className="text-[11px] font-semibold text-slate-700 font-mono mt-0.5">
                      Tờ trình: {selectedTxForView.proposalNumber}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center py-2">
                <h2 className="text-xl font-bold uppercase text-slate-900">
                  {selectedTxForView.type === 'IMPORT' ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO'}
                </h2>
                <p className="text-xs text-slate-600 italic">Ngày {formatDisplayDate(selectedTxForView.date)}</p>
              </div>

              {selectedTxForView.type === 'IMPORT' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-800 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <strong>Người lập phiếu:</strong> {selectedTxForView.creatorName}
                  </div>
                  <div>
                    <strong>Số tờ trình:</strong>{' '}
                    <span className="font-mono font-semibold text-blue-900">
                      {selectedTxForView.proposalNumber || 'Theo kế hoạch'}
                    </span>
                  </div>
                  <div>
                    <strong>Kho thực hiện:</strong> {selectedTxForView.warehouse}
                  </div>
                  <div>
                    <strong>Nhà cung cấp:</strong> {selectedTxForView.partner}
                  </div>
                  <div className="sm:col-span-2">
                    <strong>Lý do:</strong> {selectedTxForView.reason || 'Theo nhu cầu công việc'}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 text-xs text-slate-800 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <strong>Người lập phiếu:</strong> {selectedTxForView.creatorName}
                  </div>
                  <div>
                    <strong>Kho thực hiện:</strong> {selectedTxForView.warehouse}
                  </div>
                  <div className="sm:col-span-2">
                    <strong>Lý do xuất:</strong> {selectedTxForView.reason || 'Theo nhu cầu bảo trì, sửa chữa công trình'}
                  </div>
                </div>
              )}

              {/* Items Table */}
              <table className="w-full border-collapse border border-slate-300 text-xs mt-3">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800 text-center">
                    <th className="border border-slate-300 p-2 w-10">STT</th>
                    <th className="border border-slate-300 p-2 text-left">Mã Vật Tư (DN_*)</th>
                    <th className="border border-slate-300 p-2 text-left">Tên & Quy Cách Vật Tư</th>
                    <th className="border border-slate-300 p-2 w-16">ĐVT</th>
                    <th className="border border-slate-300 p-2 text-right w-20">Số Lượng</th>
                    <th className="border border-slate-300 p-2 text-right w-28">Đơn Giá (VNĐ)</th>
                    <th className="border border-slate-300 p-2 text-right w-32">Thành Tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTxForView.items.map((item, idx) => (
                    <tr key={idx} className="border border-slate-300">
                      <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-mono font-bold text-blue-900">
                        {item.materialCode}
                      </td>
                      <td className="border border-slate-300 p-2 font-medium">{item.materialName}</td>
                      <td className="border border-slate-300 p-2 text-center">{item.unit}</td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold">
                        {formatNumber(item.quantity)}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono">
                        {formatNumber(item.unitPrice)}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-950">
                        {formatNumber(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={4} className="border border-slate-300 p-2 text-center uppercase">
                      Tổng Cộng
                    </td>
                    <td className="border border-slate-300 p-2 text-right font-mono">
                      {formatNumber(selectedTxForView.totalQuantity)}
                    </td>
                    <td className="border border-slate-300 p-2"></td>
                    <td className="border border-slate-300 p-2 text-right font-mono text-blue-900 text-sm">
                      {formatVND(selectedTxForView.totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Signatures: ONLY 2 Columns as requested */}
              <div className="grid grid-cols-2 gap-8 text-center text-xs pt-8 mt-6 border-t border-slate-200">
                <div className="flex flex-col items-center">
                  <div className="font-bold uppercase tracking-wider text-slate-900">NGƯỜI LẬP PHIẾU</div>
                  <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, họ tên)</div>
                  <div className="h-20 w-48 border-b border-dashed border-slate-300 mt-2"></div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="font-bold uppercase tracking-wider text-slate-900">QUẢN LÝ / PHÊ DUYỆT</div>
                  <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký, đóng dấu)</div>
                  <div className="h-20 w-48 border-b border-dashed border-slate-300 mt-2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Approval */}
      {approvingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Xác Nhận Phê Duyệt Phiếu</h3>
                <p className="text-xs text-slate-400 font-mono">Mã: {approvingTx.code}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Sau khi Quản lý ({currentUser.fullName}) phê duyệt, hệ thống sẽ tự động{' '}
              {approvingTx.type === 'IMPORT' ? 'CỘNG' : 'TRỪ'} số lượng tồn kho cho các mã vật tư trong phiếu.
            </p>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1">Ý Kiến Phê Duyệt / Ghi Chú:</label>
              <textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setApprovingTx(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                id="btn-confirm-approve-final"
                onClick={handleConfirmApproval}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30"
              >
                Xác Nhận Duyệt Phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Rejection */}
      {rejectingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Từ Chối Phê Duyệt Phiếu</h3>
                <p className="text-xs text-slate-400 font-mono">Mã: {rejectingTx.code}</p>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1">Lý Do Từ Chối:</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingTx(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Quay lại
              </button>
              <button
                onClick={handleConfirmRejection}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Từ Chối Phiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lightbox Image Viewer */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                Tài Liệu / Ảnh Tờ Trình Đính Kèm
              </span>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 flex items-center justify-center overflow-auto max-h-[80vh]">
              {lightboxImage.startsWith('data:image') || lightboxImage.includes('images.unsplash') ? (
                <img
                  src={lightboxImage}
                  alt="Ảnh tờ trình phóng to"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
                />
              ) : (
                <iframe
                  src={lightboxImage}
                  title="Tài liệu tờ trình"
                  className="w-full h-[75vh] rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
