import React from 'react';
import {
  Package,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  FileCheck,
  TrendingUp,
  Boxes,
  Layers,
  ArrowRight,
  PlusCircle,
  Clock,
  DollarSign,
  ShieldAlert,
  ChevronRight,
  FileSpreadsheet,
  Check,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  CalculatedMaterialStock,
  InventoryTransaction,
  User,
} from '../types';
import { formatVND, formatNumber } from '../utils/inventoryEngine';

interface DashboardViewProps {
  currentUser: User;
  calculatedStocks: CalculatedMaterialStock[];
  transactions: InventoryTransaction[];
  onNavigateTab: (tab: string, filter?: string) => void;
  onOpenCreateTransaction: (type: 'IMPORT' | 'EXPORT') => void;
  onApproveTransaction: (txId: string) => void;
  onRejectTransaction: (txId: string) => void;
  onOpenStockCard: (materialCode: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  calculatedStocks,
  transactions,
  onNavigateTab,
  onOpenCreateTransaction,
  onApproveTransaction,
  onRejectTransaction,
  onOpenStockCard,
}) => {
  // Aggregate Metrics
  const totalMaterialCount = calculatedStocks.length;
  const totalStockQuantity = calculatedStocks.reduce((sum, item) => sum + Math.max(0, item.currentStock), 0);
  const totalStockValue = calculatedStocks.reduce((sum, item) => sum + item.totalValue, 0);
  const lowStockItems = calculatedStocks.filter((i) => i.stockStatus === 'LOW_STOCK' || i.stockStatus === 'OUT_OF_STOCK');
  const pendingTransactions = transactions.filter((t) => t.status === 'PENDING');
  const approvedTransactions = transactions.filter((t) => t.status === 'APPROVED');

  // Chart Data: Category Value Distribution
  const categoryDataMap: { [key: string]: { name: string; value: number; count: number } } = {};
  calculatedStocks.forEach((item) => {
    if (!categoryDataMap[item.category]) {
      categoryDataMap[item.category] = { name: item.category, value: 0, count: 0 };
    }
    categoryDataMap[item.category].value += item.totalValue;
    categoryDataMap[item.category].count += 1;
  });
  const categoryChartData = Object.values(categoryDataMap).sort((a, b) => b.value - a.value);

  // Chart Data: Recent Import vs Export comparison
  const txHistoryData = [
    {
      name: '01-05/08',
      'Nhập kho (SL)': 22,
      'Xuất kho (SL)': 80,
      'Giá trị Nhập': 140.7,
      'Giá trị Xuất': 75.2,
    },
    {
      name: '06-10/08',
      'Nhập kho (SL)': 0,
      'Xuất kho (SL)': 22,
      'Giá trị Nhập': 0,
      'Giá trị Xuất': 8.88,
    },
    {
      name: '11-15/08',
      'Nhập kho (SL)': 15,
      'Xuất kho (SL)': 10,
      'Giá trị Nhập': 32.5,
      'Giá trị Xuất': 18.0,
    },
    {
      name: '16-19/08 (Hiện tại)',
      'Nhập kho (SL)': 0,
      'Xuất kho (SL)': 3,
      'Giá trị Nhập': 0,
      'Giá trị Xuất': 12.6,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Role permission info banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl ${
                currentUser.avatarColor || 'bg-blue-600'
              } text-white flex items-center justify-center font-black text-sm shadow-md shrink-0`}
            >
              {currentUser.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(-2)
                .join('')}
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white">
                Xin chào, {currentUser.fullName}
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Hệ thống Quản lý Vật tư Kho Đội Điện Nước Công Trình (DOIDNCT) - Cảng HKQT Đà Nẵng
              </p>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-dash-create-export"
              onClick={() => onOpenCreateTransaction('EXPORT')}
              className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{currentUser.role === 'ADMIN' ? '+ Lập Phiếu Xuất' : '+ Đề Xuất Xuất'}</span>
            </button>
            <button
              id="btn-dash-create-import"
              onClick={() => onOpenCreateTransaction('IMPORT')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-600/30"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>{currentUser.role === 'ADMIN' ? '+ Lập Phiếu Nhập' : '+ Đề Xuất Nhập'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Material Types */}
        <div
          onClick={() => onNavigateTab('materials')}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 transition-all duration-200 cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Danh Mục Vật Tư</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{totalMaterialCount}</span>
            <span className="text-[11px] text-blue-400 font-medium">mặt hàng</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>100% dữ liệu chuẩn hóa</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Total Stock Quantity */}
        <div
          onClick={() => onNavigateTab('materials')}
          className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-200 cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tổng Số Lượng Tồn</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {formatNumber(totalStockQuantity)}
            </span>
            <span className="text-[11px] text-slate-400">đơn vị</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Tự động tính thời gian thực</span>
          </p>
        </div>

        {/* Total Stock Valuation */}
        <div
          onClick={() => onNavigateTab('ledger')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition-all duration-200 cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tổng Giá Trị Tồn Kho</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-emerald-400 tracking-tight block truncate">
              {formatVND(totalStockValue)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Theo đơn giá tham chiếu</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Low stock alerts */}
        <div
          onClick={() => onNavigateTab('materials', 'LOW_STOCK')}
          className={`bg-slate-900 border ${
            lowStockItems.length > 0
              ? 'border-amber-500/40 hover:border-amber-500 bg-amber-950/10'
              : 'border-slate-800'
          } rounded-2xl p-4 transition-all duration-200 cursor-pointer group shadow-sm`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Cảnh Báo Thiếu Hụt</span>
            <div
              className={`w-8 h-8 rounded-lg ${
                lowStockItems.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
              } flex items-center justify-center group-hover:scale-110 transition-transform`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                lowStockItems.length > 0 ? 'text-amber-400' : 'text-slate-300'
              } tracking-tight`}
            >
              {lowStockItems.length}
            </span>
            <span className="text-[11px] text-slate-400">vật tư &le; min</span>
          </div>
          <p className="text-[11px] text-amber-400 mt-1 flex items-center justify-between">
            <span>{lowStockItems.length > 0 ? 'Cần lập đề xuất nhập' : 'Kho đạt mức an toàn'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>

        {/* Pending approvals */}
        <div
          onClick={() => onNavigateTab('transactions', 'PENDING')}
          className={`bg-slate-900 border ${
            pendingTransactions.length > 0
              ? 'border-rose-500/40 hover:border-rose-500 bg-rose-950/10'
              : 'border-slate-800'
          } rounded-2xl p-4 transition-all duration-200 cursor-pointer group shadow-sm`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Phiếu Chờ Duyệt</span>
            <div
              className={`w-8 h-8 rounded-lg ${
                pendingTransactions.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
              } flex items-center justify-center group-hover:scale-110 transition-transform`}
            >
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                pendingTransactions.length > 0 ? 'text-rose-400' : 'text-slate-300'
              } tracking-tight`}
            >
              {pendingTransactions.length}
            </span>
            <span className="text-[11px] text-slate-400">chờ xử lý</span>
          </div>
          <p className="text-[11px] text-rose-300 mt-1 flex items-center justify-between">
            <span>{currentUser.role === 'ADMIN' ? 'Nhấn để duyệt ngay' : 'Đang chờ quản lý'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-1 transition-transform" />
          </p>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Movement trend Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Biểu Đồ Luân Chuyển Xuất - Nhập Kho Theo Đợt
              </h2>
              <p className="text-xs text-slate-400">
                So sánh khối lượng nhập và xuất (đã được Quản lý duyệt)
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('ledger')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              <span>Xem báo cáo NXT</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={txHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Nhập kho (SL)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Xuất kho (SL)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Value Breakdown Donut Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Cơ Cấu Giá Trị Theo Nhóm Vật Tư
            </h2>
            <p className="text-xs text-slate-400">Tỷ trọng vốn lưu kho theo ngành hàng</p>
          </div>

          <div className="h-56 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) =>
                    typeof value === 'number' ? formatVND(value) : String(value)
                  }
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Mini Legend list */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto pt-2 border-t border-slate-800 text-[11px]">
            {categoryChartData.slice(0, 4).map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>
                <span className="font-mono text-slate-400">{formatVND(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Columns: Pending Approval Requests & Critical Low Stock Materials */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending approvals section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Phiếu Đề Nghị Chờ Phê Duyệt</h2>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-2 py-0.5 rounded-full font-bold">
                {pendingTransactions.length}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('transactions', 'PENDING')}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Xem tất cả &rarr;
            </button>
          </div>

          {pendingTransactions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs my-auto">
              <FileCheck className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
              Không có phiếu nào đang chờ phê duyệt. Toàn bộ giao dịch đã hoàn tất!
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[320px] pr-1">
              {pendingTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                          {tx.code}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            tx.type === 'IMPORT'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {tx.type === 'IMPORT' ? 'Đề xuất Nhập' : 'Đề xuất Xuất'}
                        </span>
                        <span className="text-[11px] text-slate-400">{tx.date}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white mt-1.5">{tx.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Người lập: <strong className="text-slate-300">{tx.creatorName}</strong> ({tx.creatorEmail})
                      </p>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                        <span>
                          Số lượng: <strong className="text-white">{tx.totalQuantity}</strong>
                        </span>
                        <span>
                          Tổng tiền:{' '}
                          <strong className="text-emerald-400">{formatVND(tx.totalAmount)}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Admin Approval Actions */}
                    {currentUser.role === 'ADMIN' ? (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          id={`btn-dash-approve-${tx.id}`}
                          onClick={() => onApproveTransaction(tx.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" /> Duyệt
                        </button>
                        <button
                          id={`btn-dash-reject-${tx.id}`}
                          onClick={() => onRejectTransaction(tx.id)}
                          className="bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Từ chối
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-amber-400 px-2 py-1 rounded border border-slate-700">
                        Chờ Admin duyệt
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Urgent Items */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-bold text-white">Vật Tư Cần Bổ Sung (Dưới Định Mức)</h2>
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs px-2 py-0.5 rounded-full font-bold">
                {lowStockItems.length}
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('materials', 'LOW_STOCK')}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Xem tất cả &rarr;
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs my-auto">
              <Boxes className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
              Tuyệt vời! Toàn bộ vật tư đều duy trì trên mức an toàn.
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[320px] pr-1">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-850 border border-slate-700/80 rounded-xl p-3 hover:border-amber-500/40 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded">
                        {item.code}
                      </span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.2 rounded font-medium">
                        {item.stockStatus === 'OUT_OF_STOCK' ? 'Hết hàng' : 'Dưới định mức'}
                      </span>
                    </div>
                    <h4 className="text-xs font-medium text-white truncate mt-1">{item.name}</h4>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                      <span>
                        Tồn hiện tại:{' '}
                        <strong className="text-amber-400 font-mono">
                          {item.currentStock} {item.unit}
                        </strong>
                      </span>
                      <span>
                        Định mức min:{' '}
                        <strong className="text-slate-300 font-mono">
                          {item.minStock} {item.unit}
                        </strong>
                      </span>
                      <span>
                        Vị trí: <span className="text-slate-300">{item.location}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => onOpenStockCard(item.code)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 font-medium"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-blue-400" /> Thẻ kho
                    </button>
                    <button
                      onClick={() => onOpenCreateTransaction('IMPORT')}
                      className="bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-[11px] px-2.5 py-1 rounded-lg transition-colors font-medium text-center"
                    >
                      + Nhập thêm
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
