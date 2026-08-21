import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  X,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Package,
} from 'lucide-react';
import { NaturalSearchFilters, Material, InventoryTransaction } from '../types';
import { parseNaturalLanguageQuery } from '../utils/inventoryEngine';
import { MATERIAL_CATEGORIES } from '../data/seedData';

interface SmartSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: NaturalSearchFilters, explanation: string, targetTab?: string) => void;
  materials: Material[];
  transactions: InventoryTransaction[];
}

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  materials,
  transactions,
}) => {
  const [query, setQuery] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiResponseText, setAiResponseText] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: '⚠️ Vật tư sắp hết (dưới định mức an toàn)', q: 'vật tư dưới mức an toàn cần nhập bổ sung' },
    { label: '🔌 Dây & Cáp điện hạ thế (Cadivi, CXV)', q: 'tìm vật tư nhóm cáp điện lực và tín hiệu' },
    { label: '⚡ Thiết bị đóng cắt mã DN_CC_*', q: 'mã vật tư bắt đầu bằng DN_CC' },
    { label: '⏳ Phiếu đề nghị đang chờ phê duyệt', q: 'phiếu đang chờ duyệt', tab: 'transactions' },
    { label: '🤖 Tự động hóa & Đo lường (PLC, Biến tần)', q: 'tìm thiết bị plc biến tần đo lường' },
    { label: '📦 Vật tư hết hàng (Tồn = 0)', q: 'vật tư hết hàng tồn bằng 0' },
  ];

  const handleSearchSubmit = async (searchQuery: string, targetTab?: string) => {
    const rawQ = searchQuery || query;
    if (!rawQ.trim()) return;

    // Fast local NLP first
    const { filters, explanation } = parseNaturalLanguageQuery(rawQ, MATERIAL_CATEGORIES);

    // Call server Gemini API for smart query interpretation
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: rawQ,
          materialsSummary: `Tổng số mã vật tư DN_: ${materials.length}. Danh sách mẫu: ${materials
            .slice(0, 8)
            .map((m) => `${m.code} (${m.name})`)
            .join(', ')}`,
          transactionsSummary: `Tổng số giao dịch: ${transactions.length}. Chờ duyệt: ${
            transactions.filter((t) => t.status === 'PENDING').length
          }`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiResponseText(data.textResponse || null);
        if (data.suggestedFilters) {
          const mergedFilters: NaturalSearchFilters = {
            ...filters,
            ...(data.suggestedFilters.searchKeyword && {
              searchKeyword: data.suggestedFilters.searchKeyword,
            }),
            ...(data.suggestedFilters.stockStatus &&
              data.suggestedFilters.stockStatus !== 'ALL' && {
                stockStatus: data.suggestedFilters.stockStatus,
              }),
            ...(data.suggestedFilters.category && { category: data.suggestedFilters.category }),
          };

          const destinationTab =
            targetTab ||
            (rawQ.includes('phiếu') || rawQ.includes('chờ duyệt') ? 'transactions' : 'materials');

          onApplyFilters(mergedFilters, data.textResponse || explanation, destinationTab);
        } else {
          onApplyFilters(filters, explanation, targetTab || 'materials');
        }
      } else {
        onApplyFilters(filters, explanation, targetTab || 'materials');
      }
    } catch {
      onApplyFilters(filters, explanation, targetTab || 'materials');
    } finally {
      setLoadingAi(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-850">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div className="relative flex-1">
            <input
              id="input-ai-nl-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(query)}
              placeholder="Nhập câu hỏi tự nhiên (ví dụ: 'tìm cáp cadivi còn dưới 200m', 'mã DN_CC...', 'phiếu chờ duyệt')..."
              className="w-full bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none pr-8 font-medium"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            id="btn-submit-ai-search"
            onClick={() => handleSearchSubmit(query)}
            disabled={loadingAi || !query.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/30"
          >
            {loadingAi ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Tìm Kiếm</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Insight banner if available */}
        {aiResponseText && (
          <div className="p-3 bg-blue-950/40 border-b border-blue-800/40 text-blue-200 text-xs flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="flex-1">{aiResponseText}</p>
          </div>
        )}

        {/* Quick prompt suggestions */}
        <div className="p-4 bg-slate-900/90 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Gợi ý câu hỏi tự nhiên phổ biến</span>
            <span className="text-[11px] text-blue-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Hỗ trợ AI Gemini 3.7
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                id={`btn-quick-prompt-${idx}`}
                onClick={() => {
                  setQuery(item.q);
                  handleSearchSubmit(item.q, item.tab);
                }}
                className="text-left p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/40 transition-all text-xs text-slate-200 hover:text-white flex items-center justify-between group"
              >
                <span className="truncate mr-2">{item.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>

          {/* Quick tips about DN_ material rules */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-400" />
              <span>
                Quy tắc mã: <strong className="text-slate-300">Chỉ lấy mã bắt đầu bằng DN_</strong> (ví dụ: DN_CC_00ACB_01)
              </span>
            </div>
            <span className="text-slate-500">Ấn ESC hoặc click ra ngoài để đóng</span>
          </div>
        </div>
      </div>
    </div>
  );
};
