import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  RefreshCw,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Package,
  Boxes,
  FileCheck,
  ArrowRight,
  Zap,
} from 'lucide-react';
import {
  CalculatedMaterialStock,
  InventoryTransaction,
  PurchaseProposal,
  User,
  Material,
} from '../types';
import { formatVND, formatNumber } from '../utils/inventoryEngine';

interface AiAssistantViewProps {
  currentUser: User;
  materials: Material[];
  calculatedStocks: CalculatedMaterialStock[];
  transactions: InventoryTransaction[];
  proposals?: PurchaseProposal[];
  onOpenCreateTransaction: (type: 'IMPORT' | 'EXPORT', preselectedCode?: string) => void;
  onOpenStockCard: (code: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
}

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  currentUser,
  materials,
  calculatedStocks,
  transactions,
  proposals = [],
  onOpenCreateTransaction,
  onOpenStockCard,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Chat conversation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'AI',
      text: `Xin chào **${currentUser.fullName}**! Tôi là Trợ Lý AI Quản Lý Vật Tư Kho (Gemini 3.7 Flash). Bạn có thể hỏi tôi về tồn kho vật tư mã chuẩn \`DN_*\`, đối chiếu tiến độ các **Tờ trình mua sắm**, phát hiện nguy cơ thiếu hụt, hoặc tư vấn lập phiếu nhập/xuất kho.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  // Run full automatic AI analysis
  const runStockAnalysis = async () => {
    setAnalyzing(true);
    try {
      const payload = {
        summary: {
          totalMaterials: calculatedStocks.length,
          lowStockCount: calculatedStocks.filter((s) => s.stockStatus === 'LOW_STOCK' || s.stockStatus === 'OUT_OF_STOCK').length,
          overStockCount: calculatedStocks.filter((s) => s.stockStatus === 'OVER_STOCK').length,
          totalValue: calculatedStocks.reduce((sum, s) => sum + s.totalValue, 0),
        },
        lowStockItems: calculatedStocks
          .filter((s) => s.stockStatus === 'LOW_STOCK' || s.stockStatus === 'OUT_OF_STOCK')
          .map((s) => ({
            code: s.code,
            name: s.name,
            current: s.currentStock,
            min: s.minStock,
            unit: s.unit,
            location: s.location,
          })),
        overStockItems: calculatedStocks
          .filter((s) => s.stockStatus === 'OVER_STOCK')
          .map((s) => ({
            code: s.code,
            name: s.name,
            current: s.currentStock,
            max: s.maxStock,
            unit: s.unit,
            unitPrice: s.unitPrice,
            totalValue: s.totalValue,
          })),
        recentTransactions: transactions.slice(0, 8).map((t) => ({
          code: t.code,
          type: t.type,
          title: t.title,
          status: t.status,
          totalQty: t.totalQuantity,
        })),
        proposalsSummary: proposals.map((p) => ({
          number: p.proposalNumber,
          title: p.title,
          status: p.status,
          itemsCount: p.items.length,
        })),
      };

      const res = await fetch('/api/ai/analyze-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockData: payload }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data.analysis);
      } else {
        setAnalysisResult(
          'Đã xảy ra lỗi khi kết nối với mô hình Gemini AI. Vui lòng kiểm tra khóa GEMINI_API_KEY hoặc thử lại sau.'
        );
      }
    } catch (err) {
      setAnalysisResult(
        'Không thể kết nối đến máy chủ AI. Vui lòng kiểm tra lại kết nối mạng.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  // Send message in chat
  const handleSendMessage = async (customPrompt?: string) => {
    const q = customPrompt || inputQuestion;
    if (!q.trim() || sendingChat) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'USER',
      text: q.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setSendingChat(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          materialsSummary: JSON.stringify(
            calculatedStocks.slice(0, 80).map((s) => ({
              code: s.code,
              name: s.name,
              current: s.currentStock,
              min: s.minStock,
              unit: s.unit,
              status: s.stockStatus,
            }))
          ),
          transactionsSummary: `Tổng số phiếu: ${transactions.length}. Phiếu chờ duyệt: ${
            transactions.filter((t) => t.status === 'PENDING').length
          }`,
          proposalsSummary: JSON.stringify(
            proposals.map((p) => ({
              number: p.proposalNumber,
              title: p.title,
              items: p.items.map((i) => ({
                code: i.materialCode,
                name: i.materialName,
                requested: i.requestedQuantity,
              })),
            }))
          ),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'AI',
          text: data.textResponse || 'Tôi đã xử lý yêu cầu của bạn.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'AI',
          text: 'Xin lỗi, tôi gặp sự cố khi xử lý dữ liệu. Bạn vui lòng thử lại nhé.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch {
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'AI',
        text: 'Lỗi kết nối máy chủ AI. Vui lòng thử lại sau giây lát.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setSendingChat(false);
    }
  };

  const samplePrompts = [
    'Tờ trình 17-DNCT/PKT và 26-DNCT/PKT đã nhập đủ số lượng chưa?',
    'Phân tích các mã vật tư sắp hết hàng và gợi ý số lượng cần đặt ngay',
    'Tờ trình 31-DNCT/PKT còn thiếu những thiết bị nào cần nhập bổ sung?',
    'Kiểm tra mã vật tư DN_CC_00ACB_01 và DN_CS_EXIT_2MAT_PCCC còn bao nhiêu',
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Trợ Lý AI Tối Ưu Tồn Kho & Tìm Kiếm Tự Nhiên
            </h1>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Gemini 3.7 Flash
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Phân tích chuyên sâu dữ liệu Xuất-Nhập-Tồn, phát hiện rủi ro thiếu hụt và tư vấn kế hoạch mua sắm thông minh
          </p>
        </div>

        <button
          id="btn-run-stock-ai-analysis"
          onClick={runStockAnalysis}
          disabled={analyzing}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/30"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang phân tích dữ liệu kho...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Chạy Phân Tích Kho Toàn Diện</span>
            </>
          )}
        </button>
      </div>

      {/* AI Deep Analysis Report Box if run */}
      {analysisResult && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-lg space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Báo Cáo Đánh Giá & Khuyến Nghị Tồn Kho Tự Động</h3>
            </div>
            <button
              onClick={() => setAnalysisResult(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Đóng báo cáo
            </button>
          </div>
          <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-850 p-4 rounded-xl border border-slate-800 font-sans">
            {analysisResult}
          </div>
        </div>
      )}

      {/* Interactive AI Chat & Quick Queries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Sample prompts & Urgent highlights */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Câu Hỏi Mẫu Nhanh
            </h3>
            <div className="space-y-2">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/40 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="line-clamp-2">{p}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Snapshot */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
            <h3 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Dữ Liệu Kho Hiện Tại
            </h3>
            <div className="flex items-center justify-between text-slate-400">
              <span>Mã vật tư chuẩn DN_*:</span>
              <strong className="text-white font-mono">{calculatedStocks.length}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Cảnh báo thiếu hụt:</span>
              <strong className="text-amber-400 font-mono">
                {
                  calculatedStocks.filter(
                    (s) => s.stockStatus === 'LOW_STOCK' || s.stockStatus === 'OUT_OF_STOCK'
                  ).length
                }{' '}
                mã
              </strong>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Tổng giá trị tồn kho:</span>
              <strong className="text-emerald-400 font-mono">
                {formatVND(calculatedStocks.reduce((s, m) => s + m.totalValue, 0))}
              </strong>
            </div>
          </div>
        </div>

        {/* Right Column: Chat Box */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col h-[520px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Hỏi Đáp & Tra Cứu Kho Thông Minh</h3>
                <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Sẵn sàng phân tích theo thời gian thực
                </p>
              </div>
            </div>
          </div>

          {/* Chat message stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'AI' && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs ${
                    msg.sender === 'USER'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-800/90 text-slate-200 rounded-tl-none border border-slate-700/60 leading-relaxed'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>
                  <div
                    className={`text-[10px] mt-1.5 ${
                      msg.sender === 'USER' ? 'text-blue-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {sendingChat && (
              <div className="flex gap-3 justify-start items-center text-xs text-slate-400">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="bg-slate-800 rounded-xl px-3 py-2 border border-slate-700 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Gemini đang đọc dữ liệu tồn kho & suy luận...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat input box */}
          <div className="p-3 border-t border-slate-800 bg-slate-850">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                id="input-ai-chat"
                type="text"
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                placeholder="Nhập câu hỏi tự nhiên về vật tư (ví dụ: 'Các mã DN_CC có đủ cho dự án mới không?')..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                id="btn-send-ai-chat"
                disabled={sendingChat || !inputQuestion.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
