import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowDownRight,
  FileText,
  Image as ImageIcon,
  Eye,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  X,
  Upload,
  Calendar,
  Building2,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import {
  PurchaseProposal,
  InventoryTransaction,
  Material,
  CalculatedMaterialStock,
  User,
  ProposalItem,
} from '../types';
import { formatVND, formatNumber, formatDisplayDate } from '../utils/inventoryEngine';

interface ProposalReconciliationViewProps {
  currentUser: User;
  proposals: PurchaseProposal[];
  transactions: InventoryTransaction[];
  materials: Material[];
  calculatedStocks: CalculatedMaterialStock[];
  onStartImportForProposal: (proposal: PurchaseProposal, missingItems: Array<{ materialCode: string; missingQty: number; unitPrice: number }>) => void;
  onUpdateProposal?: (proposal: PurchaseProposal) => void;
  onCreateProposal?: (proposal: PurchaseProposal) => void;
}

export const ProposalReconciliationView: React.FC<ProposalReconciliationViewProps> = ({
  currentUser,
  proposals,
  transactions,
  materials,
  calculatedStocks,
  onStartImportForProposal,
  onUpdateProposal,
  onCreateProposal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'INCOMPLETE' | 'UNTOUCHED'>('ALL');
  const [expandedProposalId, setExpandedProposalId] = useState<string | null>(proposals[0]?.id || null);
  const [viewingAttachment, setViewingAttachment] = useState<{ url: string; name: string; type?: string } | null>(null);

  // New Proposal Modal
  const [isNewProposalModalOpen, setIsNewProposalModalOpen] = useState(false);
  const [newPropNumber, setNewPropNumber] = useState('');
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropDept, setNewPropDept] = useState('Đội Điện Nước Công Trình');
  const [newPropNotes, setNewPropNotes] = useState('');
  const [newPropAttachmentName, setNewPropAttachmentName] = useState('');
  const [newPropAttachmentUrl, setNewPropAttachmentUrl] = useState('');
  const [newPropItems, setNewPropItems] = useState<ProposalItem[]>([
    {
      materialCode: materials[0]?.code || 'DN_CC_00ACB_01',
      materialName: materials[0]?.name || 'Vật tư',
      unit: materials[0]?.unit || 'Cái',
      requestedQuantity: 10,
      unitPrice: materials[0]?.unitPrice || 0,
    },
  ]);

  // Calculate reconciliation for all proposals
  const reconciliationData = useMemo(() => {
    return proposals.map((proposal) => {
      // Find all approved or pending IMPORT transactions matching this proposal number
      const relatedImportTxs = transactions.filter(
        (tx) =>
          tx.type === 'IMPORT' &&
          tx.status !== 'REJECTED' &&
          tx.proposalNumber &&
          tx.proposalNumber.trim().toLowerCase() === proposal.proposalNumber.trim().toLowerCase()
      );

      // Aggregate imported quantities by material code
      const importedMap = new Map<string, number>();
      relatedImportTxs.forEach((tx) => {
        tx.items.forEach((item) => {
          const current = importedMap.get(item.materialCode) || 0;
          importedMap.set(item.materialCode, current + (Number(item.quantity) || 0));
        });
      });

      // Item level reconciliation
      let totalRequestedQty = 0;
      let totalImportedQty = 0;
      let completedItemsCount = 0;
      const missingItemsList: Array<{ materialCode: string; missingQty: number; unitPrice: number }> = [];

      const reconciledItems = proposal.items.map((pItem) => {
        const imported = importedMap.get(pItem.materialCode) || 0;
        const requested = Number(pItem.requestedQuantity) || 0;
        const missing = Math.max(0, requested - imported);
        const isFulfilled = imported >= requested;

        totalRequestedQty += requested;
        totalImportedQty += Math.min(requested, imported);

        if (isFulfilled) {
          completedItemsCount++;
        } else {
          missingItemsList.push({
            materialCode: pItem.materialCode,
            missingQty: missing,
            unitPrice: pItem.unitPrice || 0,
          });
        }

        return {
          ...pItem,
          actualImported: imported,
          missingQuantity: missing,
          isFulfilled,
          percentFulfilled: requested > 0 ? Math.min(100, Math.round((imported / requested) * 100)) : 100,
        };
      });

      const overallPercent =
        totalRequestedQty > 0 ? Math.min(100, Math.round((totalImportedQty / totalRequestedQty) * 100)) : 100;
      const isFullyFulfilled = overallPercent >= 100 && missingItemsList.length === 0;
      const isUntouched = totalImportedQty === 0;

      return {
        proposal,
        relatedImportTxs,
        reconciledItems,
        totalRequestedQty,
        totalImportedQty,
        overallPercent,
        isFullyFulfilled,
        isUntouched,
        completedItemsCount,
        totalItemsCount: proposal.items.length,
        missingItemsList,
      };
    });
  }, [proposals, transactions]);

  // Filtered proposals
  const filteredProposals = useMemo(() => {
    return reconciliationData.filter((item) => {
      if (statusFilter === 'COMPLETED' && !item.isFullyFulfilled) return false;
      if (statusFilter === 'INCOMPLETE' && (item.isFullyFulfilled || item.isUntouched)) return false;
      if (statusFilter === 'UNTOUCHED' && !item.isUntouched) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = item.proposal.proposalNumber.toLowerCase().includes(q);
        const matchTitle = item.proposal.title.toLowerCase().includes(q);
        const matchCreator = item.proposal.creatorName.toLowerCase().includes(q);
        const matchItems = item.proposal.items.some(
          (i) => i.materialCode.toLowerCase().includes(q) || i.materialName.toLowerCase().includes(q)
        );
        if (!matchNum && !matchTitle && !matchCreator && !matchItems) return false;
      }

      return true;
    });
  }, [reconciliationData, statusFilter, searchQuery]);

  // Handle file upload for new proposal
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPropAttachmentName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewPropAttachmentUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Item to new proposal
  const handleAddNewItemRow = () => {
    const defaultMat = materials[0];
    setNewPropItems([
      ...newPropItems,
      {
        materialCode: defaultMat?.code || 'DN_CC_00ACB_01',
        materialName: defaultMat?.name || 'Vật tư mới',
        unit: defaultMat?.unit || 'Cái',
        requestedQuantity: 5,
        unitPrice: defaultMat?.unitPrice || 0,
      },
    ]);
  };

  const handleRemoveNewItemRow = (index: number) => {
    setNewPropItems(newPropItems.filter((_, i) => i !== index));
  };

  const handleNewItemChange = (index: number, field: keyof ProposalItem, value: any) => {
    const updated = [...newPropItems];
    if (field === 'materialCode') {
      const mat = materials.find((m) => m.code === value);
      updated[index] = {
        ...updated[index],
        materialCode: value,
        materialName: mat?.name || updated[index].materialName,
        unit: mat?.unit || updated[index].unit,
        unitPrice: mat?.unitPrice || updated[index].unitPrice,
      };
    } else {
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
    }
    setNewPropItems(updated);
  };

  // Save new proposal
  const handleSaveNewProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropNumber.trim() || !newPropTitle.trim()) {
      alert('Vui lòng điền đầy đủ Số tờ trình và Tiêu đề đề xuất.');
      return;
    }
    if (newPropItems.length === 0) {
      alert('Vui lòng thêm ít nhất một vật tư đề xuất.');
      return;
    }

    const created: PurchaseProposal = {
      id: `prop-${Date.now()}`,
      proposalNumber: newPropNumber.trim(),
      title: newPropTitle.trim(),
      date: new Date().toISOString().split('T')[0],
      creatorName: currentUser.fullName,
      creatorEmail: currentUser.email,
      department: newPropDept.trim() || 'Đội Điện Nước Công Trình',
      status: 'APPROVED',
      attachmentName: newPropAttachmentName || undefined,
      attachmentUrl: newPropAttachmentUrl || undefined,
      attachmentType: newPropAttachmentName.endsWith('.pdf') ? 'pdf' : 'image',
      notes: newPropNotes.trim() || undefined,
      items: newPropItems,
      createdAt: new Date().toISOString(),
    };

    if (onCreateProposal) {
      onCreateProposal(created);
    }
    setIsNewProposalModalOpen(false);
    setNewPropNumber('');
    setNewPropTitle('');
    setNewPropNotes('');
    setNewPropAttachmentName('');
    setNewPropAttachmentUrl('');
  };

  const completedCount = reconciliationData.filter((r) => r.isFullyFulfilled).length;
  const incompleteCount = reconciliationData.filter((r) => !r.isFullyFulfilled && !r.isUntouched).length;
  const untouchedCount = reconciliationData.filter((r) => r.isUntouched).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-blue-500/30 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Đối Chiếu Tờ Trình Nhập Kho & Nhập Bổ Sung
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Theo dõi số lượng đã nhập thực tế so với Tờ trình Quản lý đã ký duyệt. Hệ thống tự động phát hiện số lượng còn thiếu,
              thông báo khi đã nhập đủ 100%, và cho phép lập phiếu nhập bổ sung đúng vào từng Tờ trình.
            </p>
          </div>

          <button
            id="btn-create-new-proposal"
            onClick={() => setIsNewProposalModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-blue-600/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo Tờ Trình Mới</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 text-[11px]">Tổng số Tờ trình:</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">{proposals.length}</div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-emerald-500/20">
            <div className="text-emerald-400 text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã nhập đủ (100%):
            </div>
            <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">{completedCount}</div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-amber-500/20">
            <div className="text-amber-400 text-[11px] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Đang nhập thiếu (Cần bổ sung):
            </div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">{incompleteCount}</div>
          </div>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            <div className="text-slate-400 text-[11px]">Chưa nhập kho (0%):</div>
            <div className="text-lg font-bold text-slate-300 font-mono mt-0.5">{untouchedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              statusFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất Cả ({reconciliationData.length})
          </button>
          <button
            onClick={() => setStatusFilter('INCOMPLETE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
              statusFilter === 'INCOMPLETE' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Còn Thiếu ({incompleteCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
              statusFilter === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã Đủ 100% ({completedCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('UNTOUCHED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              statusFilter === 'UNTOUCHED' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chưa Nhập ({untouchedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo số tờ trình (17-DNCT/PKT), tiêu đề..."
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
      </div>

      {/* Proposal Cards List */}
      <div className="space-y-4">
        {filteredProposals.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
            <p>Không tìm thấy Tờ trình nào theo điều kiện tìm kiếm.</p>
          </div>
        ) : (
          filteredProposals.map((item) => {
            const {
              proposal,
              reconciledItems,
              overallPercent,
              isFullyFulfilled,
              isUntouched,
              missingItemsList,
              relatedImportTxs,
            } = item;

            const isExpanded = expandedProposalId === proposal.id;

            return (
              <div
                key={proposal.id}
                className={`bg-slate-900 border rounded-2xl transition-all shadow-sm ${
                  isFullyFulfilled
                    ? 'border-emerald-500/30 hover:border-emerald-500/50'
                    : isUntouched
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-amber-500/40 hover:border-amber-500/60'
                }`}
              >
                {/* Proposal Header Accordion Bar */}
                <div
                  onClick={() => setExpandedProposalId(isExpanded ? null : proposal.id)}
                  className="p-4 sm:p-5 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="bg-blue-950 text-blue-300 border border-blue-700/70 font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
                        Số: {proposal.proposalNumber}
                      </span>

                      {isFullyFulfilled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ĐÃ ĐỦ SỐ LƯỢNG (100%)
                        </span>
                      ) : isUntouched ? (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> CHƯA NHẬP KHO (0%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" /> CÒN THIẾU {missingItemsList.length} MÓN ({overallPercent}%)
                        </span>
                      )}

                      {proposal.attachmentName && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingAttachment({
                              url: proposal.attachmentUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
                              name: proposal.attachmentName || 'Tờ trình phê duyệt',
                              type: proposal.attachmentType,
                            });
                          }}
                          className="inline-flex items-center gap-1 text-[11px] bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full transition-colors"
                        >
                          <ImageIcon className="w-3 h-3" />
                          <span>Đính kèm: {proposal.attachmentName}</span>
                          <Eye className="w-3 h-3 ml-0.5" />
                        </button>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                      {proposal.title}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      <div>
                        Ngày lập: <strong className="text-slate-300 font-mono">{formatDisplayDate(proposal.date)}</strong>
                      </div>
                      <div>
                        Người đề xuất: <strong className="text-slate-300">{proposal.creatorName}</strong>
                      </div>
                      <div>
                        Đơn vị: <strong className="text-slate-300">{proposal.department}</strong>
                      </div>
                      <div>
                        Phiếu nhập liên quan: <strong className="text-blue-400 font-mono">{relatedImportTxs.length} phiếu</strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Progress & Quick Action Button */}
                  <div className="flex items-center gap-4 shrink-0 justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    <div className="w-36 text-right space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">Tiến độ nhập:</span>
                        <span className={`font-mono font-bold ${isFullyFulfilled ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {overallPercent}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFullyFulfilled ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${overallPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isFullyFulfilled && (
                        <button
                          type="button"
                          id={`btn-import-proposal-${proposal.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartImportForProposal(proposal, missingItemsList);
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-blue-600/30"
                        >
                          <ArrowDownRight className="w-4 h-4" />
                          <span>{isUntouched ? 'Lập Phiếu Nhập Kho' : 'Nhập Bổ Sung Số Còn Thiếu'}</span>
                        </button>
                      )}

                      {isFullyFulfilled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartImportForProposal(proposal, []);
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Nhập thêm</span>
                        </button>
                      )}

                      <div className="p-1.5 text-slate-400 hover:text-white rounded-lg">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Table */}
                {isExpanded && (
                  <div className="border-t border-slate-800 p-4 sm:p-5 bg-slate-850/70 space-y-4 animate-in fade-in duration-200">
                    {proposal.notes && (
                      <div className="text-xs bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 text-slate-300">
                        <strong className="text-blue-300">Ghi chú phê duyệt:</strong> {proposal.notes}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                          Chi Tiết Bảng Đối Chiếu Vật Tư (Đề Xuất vs. Thực Nhập Lũy Kế)
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Đã hoàn thành: <strong className="text-white">{item.completedItemsCount}/{item.totalItemsCount}</strong> vật tư
                        </span>
                      </div>

                      <div className="overflow-x-auto bg-slate-900 rounded-xl border border-slate-800">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-850 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                            <tr>
                              <th className="py-2.5 px-3">STT</th>
                              <th className="py-2.5 px-3">Mã Vật Tư (DN_*)</th>
                              <th className="py-2.5 px-4">Tên & Quy Cách Vật Tư</th>
                              <th className="py-2.5 px-2 text-center">ĐVT</th>
                              <th className="py-2.5 px-3 text-right">Đề Xuất (Tờ Trình)</th>
                              <th className="py-2.5 px-3 text-right">Đã Nhập Lũy Kế</th>
                              <th className="py-2.5 px-3 text-right">Số Lượng Còn Thiếu</th>
                              <th className="py-2.5 px-3 text-center">Tiến Độ</th>
                              <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {reconciledItems.map((pItem, idx) => (
                              <tr
                                key={idx}
                                className={`hover:bg-slate-800/50 ${
                                  pItem.isFulfilled ? 'bg-emerald-950/10' : 'bg-amber-950/10'
                                }`}
                              >
                                <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-blue-300">
                                  {pItem.materialCode}
                                </td>
                                <td className="py-2.5 px-4 font-medium text-white">{pItem.materialName}</td>
                                <td className="py-2.5 px-2 text-center">{pItem.unit}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">
                                  {formatNumber(pItem.requestedQuantity)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-400">
                                  {formatNumber(pItem.actualImported)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">
                                  {pItem.missingQuantity > 0 ? (
                                    <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                      -{formatNumber(pItem.missingQuantity)}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-400 font-semibold">0 (Đã đủ)</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="w-16 mx-auto">
                                    <div className="text-[10px] font-mono text-slate-400 mb-0.5">
                                      {pItem.percentFulfilled}%
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          pItem.isFulfilled ? 'bg-emerald-500' : 'bg-amber-500'
                                        }`}
                                        style={{ width: `${pItem.percentFulfilled}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {pItem.isFulfilled ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                      <Check className="w-3 h-3" /> Đủ
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                                      <AlertTriangle className="w-3 h-3" /> Thiếu
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Related Import Vouchers History */}
                    {relatedImportTxs.length > 0 && (
                      <div className="pt-2">
                        <div className="text-xs font-semibold text-slate-300 mb-2">
                          Các Phiếu Nhập Kho Đã Nhập Cho Tờ Trình Này:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {relatedImportTxs.map((tx) => (
                            <div
                              key={tx.id}
                              className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-mono font-bold text-blue-400">{tx.code}</div>
                                <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{tx.title}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">Ngày: {tx.date}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono font-semibold text-emerald-400">
                                  {formatVND(tx.totalAmount)}
                                </div>
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-medium">
                                  {tx.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox / View Attachment Modal */}
      {viewingAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Xem File / Ảnh Tờ Trình Đính Kèm</h3>
                <span className="text-xs text-slate-400 font-mono">({viewingAttachment.name})</span>
              </div>
              <button
                onClick={() => setViewingAttachment(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex items-center justify-center bg-slate-950/60 min-h-[400px]">
              {viewingAttachment.type === 'pdf' || viewingAttachment.name.endsWith('.pdf') ? (
                <div className="text-center space-y-4 max-w-md p-8 bg-slate-900 rounded-2xl border border-slate-800">
                  <div className="w-16 h-16 rounded-2xl bg-rose-600/20 text-rose-400 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-white text-base">{viewingAttachment.name}</h4>
                  <p className="text-xs text-slate-400">
                    Tài liệu Tờ trình định dạng PDF đã được ký duyệt chính thức bởi Ban Giám đốc và Phòng Kỹ thuật.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => alert(`Đang mở tài liệu: ${viewingAttachment.name}`)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> Tải / Xem Trực Tiếp PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-full max-h-[70vh] flex flex-col items-center">
                  <img
                    src={viewingAttachment.url}
                    alt={viewingAttachment.name}
                    className="max-h-[65vh] max-w-full rounded-xl object-contain border border-slate-700 shadow-xl"
                  />
                  <p className="text-xs text-slate-400 mt-3 italic">{viewingAttachment.name}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Purchase Proposal */}
      {isNewProposalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Tạo Tờ Trình Đề Xuất Mua Sắm Vật Tư Mới</h3>
              </div>
              <button
                onClick={() => setIsNewProposalModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProposal} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Số Tờ Trình Phê Duyệt <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPropNumber}
                    onChange={(e) => setNewPropNumber(e.target.value)}
                    placeholder="Ví dụ: 48-DNCT/PKT, 52-DNCT/PKT..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Đơn Vị Đề Xuất</label>
                  <input
                    type="text"
                    value={newPropDept}
                    onChange={(e) => setNewPropDept(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Tiêu Đề / Nội Dung Tờ Trình <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newPropTitle}
                  onChange={(e) => setNewPropTitle(e.target.value)}
                  placeholder="Ví dụ: Tờ trình đề xuất mua sắm bổ sung máy cắt không khí ACB & phụ kiện bảo trì..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Upload File / Image Proposal Attachment */}
              <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-medium">
                  Đính Kèm File / Ảnh Tờ Trình Đã Ký Duyệt <span className="text-slate-400 font-normal">(Không bắt buộc)</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2 transition-colors">
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Chọn File hoặc Ảnh Tờ Trình (.png, .jpg, .pdf)</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {newPropAttachmentName && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                      <FileCheck className="w-4 h-4" />
                      <span>{newPropAttachmentName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewPropAttachmentName('');
                          setNewPropAttachmentUrl('');
                        }}
                        className="text-slate-400 hover:text-rose-400 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Items in Proposal */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 uppercase tracking-wider">
                    Danh Sách Vật Tư Đề Xuất (Mã Chuẩn DN_*)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddNewItemRow}
                    className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Thêm vật tư
                  </button>
                </div>

                <div className="bg-slate-850 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Vật Tư (Mã DN_*)</th>
                        <th className="py-2.5 px-3 text-right">Số Lượng Đề Xuất</th>
                        <th className="py-2.5 px-3 text-right">Đơn Giá Dự Kiến</th>
                        <th className="py-2.5 px-2 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {newPropItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3">
                            <select
                              value={item.materialCode}
                              onChange={(e) => handleNewItemChange(idx, 'materialCode', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                            >
                              {materials.map((m) => (
                                <option key={m.code} value={m.code}>
                                  {m.code} - {m.name} ({m.unit})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="1"
                              value={item.requestedQuantity}
                              onChange={(e) =>
                                handleNewItemChange(idx, 'requestedQuantity', Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right font-mono text-white focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={item.unitPrice || 0}
                              onChange={(e) =>
                                handleNewItemChange(idx, 'unitPrice', Math.max(0, parseInt(e.target.value) || 0))
                              }
                              className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-right font-mono text-white focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {newPropItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveNewItemRow(idx)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Ghi Chú Phê Duyệt</label>
                <textarea
                  value={newPropNotes}
                  onChange={(e) => setNewPropNotes(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú về phê duyệt, căn cứ biên bản hoặc kế hoạch mua sắm..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewProposalModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
                >
                  Lưu Tờ Trình Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
