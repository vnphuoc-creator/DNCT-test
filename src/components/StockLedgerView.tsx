import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Package,
  Boxes,
  DollarSign,
  ChevronRight,
  Building2,
  Clock,
  Filter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Material,
  CalculatedMaterialStock,
  InventoryTransaction,
  StockCardEntry,
} from '../types';
import {
  formatVND,
  formatNumber,
  generateStockCard,
} from '../utils/inventoryEngine';
import {
  calculateDateRangeReportData,
  exportToOfficialExcel,
  DetailedStockReportItem,
} from '../utils/excelExporter';
import { MATERIAL_CATEGORIES } from '../data/seedData';
import { AHTLogo } from './AHTLogo';

interface StockLedgerViewProps {
  materials: Material[];
  calculatedStocks: CalculatedMaterialStock[];
  transactions: InventoryTransaction[];
  initialMaterialCode?: string;
}

export const StockLedgerView: React.FC<StockLedgerViewProps> = ({
  materials,
  calculatedStocks,
  transactions,
  initialMaterialCode,
}) => {
  const [subTab, setSubTab] = useState<'REPORT' | 'CARD'>('REPORT');
  const [selectedMaterialCode, setSelectedMaterialCode] = useState<string>(
    initialMaterialCode || materials[0]?.code || ''
  );

  // Date Range Filters for Report
  const [datePreset, setDatePreset] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'AUG2026' | 'YEAR' | 'CUSTOM'>('YEAR');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [warehouseName, setWarehouseName] = useState('DOIDNCT: Đội Điện nước công trình-DOIDNCT');
  const [selectedProposalNumber, setSelectedProposalNumber] = useState<string>('ALL');
  const [onlyMovement, setOnlyMovement] = useState<boolean>(false);
  const [reportCategory, setReportCategory] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Extract all proposal numbers from transactions
  const availableProposalNumbers = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.proposalNumber && t.proposalNumber.trim()) {
        set.add(t.proposalNumber.trim());
      }
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Update if initial code changes
  React.useEffect(() => {
    if (initialMaterialCode) {
      setSelectedMaterialCode(initialMaterialCode);
    }
  }, [initialMaterialCode]);

  // Handle Preset Date selection
  const handleSelectPreset = (preset: 'TODAY' | 'WEEK' | 'MONTH' | 'AUG2026' | 'YEAR') => {
    setDatePreset(preset);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'WEEK') {
      // Current week Monday to Sunday
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now.setDate(diff));
      const sun = new Date(now.setDate(diff + 6));
      setStartDate(`${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`);
      setEndDate(`${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`);
    } else if (preset === 'MONTH') {
      // First to last day of current month
      const y = now.getFullYear();
      const m = now.getMonth();
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      setStartDate(`${y}-${pad(m + 1)}-${pad(first.getDate())}`);
      setEndDate(`${y}-${pad(m + 1)}-${pad(last.getDate())}`);
    } else if (preset === 'AUG2026') {
      setStartDate('2026-08-01');
      setEndDate('2026-08-31');
    } else if (preset === 'YEAR') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
    }
  };

  // Calculate detailed Report Data according to active Date Range & Proposal Number
  const fullReportData = useMemo(() => {
    return calculateDateRangeReportData(
      materials,
      transactions,
      startDate,
      endDate,
      selectedProposalNumber
    );
  }, [materials, transactions, startDate, endDate, selectedProposalNumber]);

  // Count items with movement in current filtered range
  const movementCount = useMemo(() => {
    return fullReportData.filter((item) => item.importQty > 0 || item.exportQty > 0).length;
  }, [fullReportData]);

  // Filter report data by category, search, and onlyMovement toggle
  const filteredReportData = useMemo(() => {
    return fullReportData.filter((item) => {
      if (onlyMovement && item.importQty === 0 && item.exportQty === 0) {
        return false;
      }
      if (reportCategory !== 'ALL' && item.category !== reportCategory) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchName = item.name.toLowerCase().includes(q);
        if (!matchCode && !matchName) return false;
      }
      return true;
    });
  }, [fullReportData, onlyMovement, reportCategory, searchFilter]);

  // Totals for summary row
  const reportTotals = useMemo(() => {
    return filteredReportData.reduce(
      (acc, it) => {
        acc.openingQty += it.openingQty;
        acc.openingValue += it.openingValue;
        acc.importQty += it.importQty;
        acc.importValue += it.importValue;
        acc.exportQty += it.exportQty;
        acc.exportValue += it.exportValue;
        acc.closingQty += it.closingQty;
        acc.closingValue += it.closingValue;
        return acc;
      },
      {
        openingQty: 0,
        openingValue: 0,
        importQty: 0,
        importValue: 0,
        exportQty: 0,
        exportValue: 0,
        closingQty: 0,
        closingValue: 0,
      }
    );
  }, [filteredReportData]);

  // Active Material details for Stock Card tab
  const activeMaterial = useMemo(() => {
    return (
      calculatedStocks.find((m) => m.code === selectedMaterialCode) ||
      materials.find((m) => m.code === selectedMaterialCode) ||
      materials[0]
    );
  }, [calculatedStocks, materials, selectedMaterialCode]);

  // Stock Card entries for selected material
  const stockCardEntries: StockCardEntry[] = useMemo(() => {
    if (!selectedMaterialCode) return [];
    return generateStockCard(selectedMaterialCode, materials, transactions);
  }, [selectedMaterialCode, materials, transactions]);

  // Chart data for stock card balance
  const balanceChartData = useMemo(() => {
    return stockCardEntries.map((e) => ({
      name: `${e.date.slice(5)} (${e.documentCode})`,
      'Tồn kho': e.balance,
      'Nhập': e.quantityIn,
      'Xuất': e.quantityOut,
    }));
  }, [stockCardEntries]);

  // Format dates for display (DD/MM/YYYY)
  const formatDisplayDate = (dStr: string) => {
    const parts = dStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    exportToOfficialExcel(
      filteredReportData,
      startDate,
      endDate,
      warehouseName,
      selectedProposalNumber
    );
  };

  // Print Report Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Tổng Hợp Nhập - Xuất - Tồn & Sổ Thẻ Kho
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Báo cáo tổng hợp Nhập - Xuất - Tồn chuẩn biểu mẫu công ty và sổ thẻ kho điện tử
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            id="subtab-summary-report"
            onClick={() => setSubTab('REPORT')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              subTab === 'REPORT' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" /> Báo Cáo Tổng Hợp (N-X-T)
          </button>
          <button
            id="subtab-stock-card"
            onClick={() => setSubTab('CARD')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              subTab === 'CARD' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Sổ Thẻ Kho Chi Tiết
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: OFFICIAL TỔNG HỢP NHẬP - XUẤT - TỒN REPORT (EXACT IMAGE FORM) */}
      {/* ========================================================================= */}
      {subTab === 'REPORT' && (
        <div className="space-y-6">
          {/* Controls: Date Range (Tuần/Tháng/Năm/Tùy chọn), Kho hàng, Export button */}
          <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Preset buttons & Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" /> Kỳ báo cáo:
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('AUG2026')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    datePreset === 'AUG2026'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Tháng 8/2026
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('MONTH')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    datePreset === 'MONTH'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Tháng này
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('WEEK')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    datePreset === 'WEEK'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Tuần này
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('YEAR')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    datePreset === 'YEAR'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Năm 2026
                </button>
              </div>

              {/* Action Buttons: Export to Excel (.xlsx) & In / Xuất PDF */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  id="btn-export-official-excel"
                  onClick={handleExportExcel}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                  title="Xuất bảng tính Excel đầy đủ công thức và mẫu biểu"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  id="btn-print-pdf-official"
                  onClick={handlePrint}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20"
                  title="In trực tiếp hoặc chọn 'Lưu dưới dạng PDF' khổ A4 Ngang"
                >
                  <Printer className="w-4 h-4" />
                  <span>In / Xuất PDF (A4 Ngang)</span>
                </button>
              </div>
            </div>

            {/* Custom Date Pickers, Proposal Number & Category filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-800">
              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Từ ngày (Bắt đầu)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Đến ngày (Kết thúc)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('CUSTOM');
                  }}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Proposal Number Selector */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Theo Số tờ trình
                </label>
                <select
                  value={selectedProposalNumber}
                  onChange={(e) => setSelectedProposalNumber(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-amber-300 font-medium rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">-- Tất cả tờ trình --</option>
                  {availableProposalNumbers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Warehouse selector */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Kho hàng</label>
                <select
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="DOIDNCT: Đội Điện nước công trình-DOIDNCT">
                    DOIDNCT: Đội Điện nước công trình
                  </option>
                  <option value="Kho Tổng AHT">Kho Tổng AHT</option>
                  <option value="Kho Dự Phòng Kỹ Thuật">Kho Dự Phòng Kỹ Thuật</option>
                </select>
              </div>

              {/* Search filter */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Tìm kiếm vật tư
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Mã số hoặc tên mặt hàng..."
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Movement Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyMovement(false)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    !onlyMovement
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tất cả danh mục ({fullReportData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyMovement(true)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                    onlyMovement
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-amber-400 hover:bg-slate-800'
                  }`}
                >
                  <span>Chỉ hiện vật tư có phát sinh (X-N)</span>
                  <span className="bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {movementCount}
                  </span>
                </button>
              </div>

              {selectedProposalNumber !== 'ALL' && (
                <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-lg text-amber-300 text-xs">
                  <span>Đang lọc theo tờ trình:</span>
                  <strong className="text-white">{selectedProposalNumber}</strong>
                  <button
                    type="button"
                    onClick={() => setSelectedProposalNumber('ALL')}
                    className="ml-1 text-slate-400 hover:text-white"
                    title="Xóa lọc tờ trình"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Official Spreadsheet Template Preview (Matching official AHT layout) */}
          <div className="printable-area bg-slate-900 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
            {/* Spreadsheet Official Top Header */}
            <div className="p-6 bg-slate-950/80 border-b border-slate-800">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AHTLogo className="h-10 w-auto" showPlane={false} allowUpload={false} />
                  <div>
                    <div className="text-xs sm:text-sm font-bold tracking-wide text-slate-200 uppercase">
                      CÔNG TY CỔ PHẦN ĐẦU TƯ KHAI THÁC NHÀ GA QUỐC TẾ ĐÀ NẴNG
                    </div>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-400">Mẫu số: 01-VT</div>
                </div>
              </div>

              <div className="pt-4 pb-2 text-center">
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                  BÁO CÁO TỔNG HỢP NHẬP - XUẤT - TỒN
                </h2>
                <p className="text-xs italic text-slate-400 mt-1">
                  Từ ngày {formatDisplayDate(startDate)} đến ngày {formatDisplayDate(endDate)}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300 mt-1.5">
                  <p>
                    Kho hàng: <span className="text-amber-400 font-bold">{warehouseName}</span>
                  </p>
                  {selectedProposalNumber !== 'ALL' && (
                    <p className="text-blue-400 font-bold bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/50">
                      Tờ trình: {selectedProposalNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Official Multi-Header Table */}
            <div className="overflow-x-auto">
              <table className="printable-table w-full text-xs text-left border-collapse min-w-[1000px]">
                <thead>
                  {/* Row 1 Header */}
                  <tr className="bg-slate-850 text-slate-300 font-bold border-b border-slate-700 text-center">
                    <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-700 w-36">
                      Mã số
                    </th>
                    <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-700 text-left min-w-[220px]">
                      Mặt hàng
                    </th>
                    <th rowSpan={2} className="px-2 py-2.5 border-r border-slate-700 w-16">
                      Đvt
                    </th>
                    <th colSpan={2} className="px-3 py-1.5 border-r border-slate-700 bg-slate-800/80">
                      Đầu kỳ
                    </th>
                    <th colSpan={2} className="px-3 py-1.5 border-r border-slate-700 bg-blue-950/40 text-blue-300">
                      Nhập
                    </th>
                    <th colSpan={2} className="px-3 py-1.5 border-r border-slate-700 bg-amber-950/40 text-amber-300">
                      Xuất
                    </th>
                    <th colSpan={2} className="px-3 py-1.5 border-r border-slate-700 bg-emerald-950/40 text-emerald-300">
                      Cuối kỳ
                    </th>
                    <th rowSpan={2} className="px-3 py-2.5 w-28">
                      Ngày nhập cuối
                    </th>
                  </tr>

                  {/* Row 2 Sub-Header */}
                  <tr className="bg-slate-850 text-slate-400 font-semibold border-b-2 border-slate-700 text-center text-[11px]">
                    {/* Đầu kỳ */}
                    <th className="px-2.5 py-1.5 border-r border-slate-700">Số lượng</th>
                    <th className="px-2.5 py-1.5 border-r border-slate-700">Giá trị</th>
                    {/* Nhập */}
                    <th className="px-2.5 py-1.5 border-r border-slate-700 text-blue-300">Số lượng</th>
                    <th className="px-2.5 py-1.5 border-r border-slate-700 text-blue-300">Giá trị</th>
                    {/* Xuất */}
                    <th className="px-2.5 py-1.5 border-r border-slate-700 text-amber-300">Số lượng</th>
                    <th className="px-2.5 py-1.5 border-r border-slate-700 text-amber-300">Giá trị</th>
                    {/* Cuối kỳ */}
                    <th className="px-2.5 py-1.5 border-r border-slate-700 text-emerald-300">Số lượng</th>
                    <th className="px-2.5 py-1.5 border-r border-slate-700 text-emerald-300">Giá trị</th>
                  </tr>

                  {/* Row 3: Category Summary / Subtotal Row (VẬT TƯ AHT) */}
                  <tr className="bg-slate-800/90 text-white font-bold border-b-2 border-slate-600">
                    <td className="px-3 py-2 border-r border-slate-700 font-mono text-center text-[11px] text-slate-400">
                      TỔNG CỘNG
                    </td>
                    <td className="px-3 py-2 border-r border-slate-700 uppercase tracking-wide text-amber-400">
                      VẬT TƯ AHT ({filteredReportData.length} mục)
                    </td>
                    <td className="px-2 py-2 border-r border-slate-700 text-center">-</td>
                    {/* Đầu kỳ */}
                    <td className="px-2.5 py-2 border-r border-slate-700 text-right font-mono text-slate-200">
                      {formatNumber(reportTotals.openingQty)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-700 text-right font-mono text-slate-200">
                      {formatVND(reportTotals.openingValue)}
                    </td>
                    {/* Nhập */}
                    <td className="px-2.5 py-2 border-r border-slate-700 text-right font-mono text-blue-300">
                      {formatNumber(reportTotals.importQty)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-700 text-right font-mono text-blue-300">
                      {formatVND(reportTotals.importValue)}
                    </td>
                    {/* Xuất */}
                    <td className="px-2.5 py-2 border-r border-slate-700 text-right font-mono text-amber-300">
                      {formatNumber(reportTotals.exportQty)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-700 text-right font-mono text-amber-300">
                      {formatVND(reportTotals.exportValue)}
                    </td>
                    {/* Cuối kỳ */}
                    <td className="px-2.5 py-2 border-r border-slate-700 text-right font-mono text-emerald-300">
                      {formatNumber(reportTotals.closingQty)}
                    </td>
                    <td className="px-2.5 py-2 border-r border-slate-700 text-right font-mono text-emerald-300">
                      {formatVND(reportTotals.closingValue)}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-400">-</td>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {filteredReportData.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-slate-500 font-sans">
                        Không có dữ liệu vật tư phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredReportData.map((item, idx) => (
                      <tr
                        key={item.code}
                        className={`hover:bg-slate-800/60 transition-colors ${
                          idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-900/40'
                        }`}
                      >
                        {/* Mã số */}
                        <td className="px-3 py-2 border-r border-slate-800 font-bold text-blue-400 whitespace-nowrap">
                          {item.code}
                        </td>
                        {/* Mặt hàng */}
                        <td className="px-3 py-2 border-r border-slate-800 font-sans text-slate-200 max-w-xs truncate">
                          {item.name}
                        </td>
                        {/* Đvt */}
                        <td className="px-2 py-2 border-r border-slate-800 font-sans text-slate-400 text-center">
                          {item.unit}
                        </td>
                        {/* Đầu kỳ */}
                        <td className="px-2.5 py-2 border-r border-slate-800 text-right text-slate-300">
                          {formatNumber(item.openingQty)}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-800 text-right text-slate-400">
                          {formatVND(item.openingValue)}
                        </td>
                        {/* Nhập */}
                        <td className="px-2.5 py-2 border-r border-slate-800 text-right text-blue-300 font-semibold">
                          {item.importQty > 0 ? formatNumber(item.importQty) : '-'}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-800 text-right text-blue-400/80">
                          {item.importValue > 0 ? formatVND(item.importValue) : '-'}
                        </td>
                        {/* Xuất */}
                        <td className="px-2.5 py-2 border-r border-slate-800 text-right text-amber-300 font-semibold">
                          {item.exportQty > 0 ? formatNumber(item.exportQty) : '-'}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-800 text-right text-amber-400/80">
                          {item.exportValue > 0 ? formatVND(item.exportValue) : '-'}
                        </td>
                        {/* Cuối kỳ */}
                        <td className="px-2.5 py-2 border-r border-slate-800 text-right text-emerald-300 font-bold">
                          {formatNumber(item.closingQty)}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-800 text-right text-emerald-400">
                          {formatVND(item.closingValue)}
                        </td>
                        {/* Ngày nhập cuối */}
                        <td className="px-3 py-2 text-center text-slate-400 whitespace-nowrap">
                          {item.lastImportDate}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Report Signature Block (For PDF & Print export - 2 Columns) */}
            <div className="p-6 bg-slate-950/60 border-t border-slate-800 print-signatures">
              <div className="text-right text-xs italic text-slate-400 mb-6">
                Đà Nẵng, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
              </div>

              <div className="grid grid-cols-2 gap-12 text-center text-xs">
                {/* 1. Người lập biểu */}
                <div className="space-y-1">
                  <div className="font-bold text-slate-200 uppercase text-sm">NGƯỜI LẬP BIỂU</div>
                  <div className="text-[11px] text-slate-400 italic">(Ký, ghi rõ họ tên)</div>
                  <div className="h-24 flex items-end justify-center font-medium text-slate-400">
                    <span className="border-b border-dashed border-slate-600/80 w-48 block"></span>
                  </div>
                </div>

                {/* 2. Quản lý / Phê duyệt */}
                <div className="space-y-1">
                  <div className="font-bold text-slate-200 uppercase text-sm">QUẢN LÝ / PHÊ DUYỆT</div>
                  <div className="text-[11px] text-slate-400 italic">(Ký, đóng dấu)</div>
                  <div className="h-24 flex items-end justify-center font-medium text-slate-400">
                    <span className="border-b border-dashed border-slate-600/80 w-48 block"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table bottom pagination / export summary footer */}
            <div className="no-print p-3 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
              <div>
                Hiển thị <strong>{filteredReportData.length}</strong> / {materials.length} mặt hàng
                trong kỳ từ <strong>{formatDisplayDate(startDate)}</strong> đến{' '}
                <strong>{formatDisplayDate(endDate)}</strong>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> In / Xuất PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Tải xuống bảng tính Excel (.xlsx)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: DETAIL ELECTRONIC STOCK CARD (SỔ THẺ KHO ĐIỆN TỬ TỪNG MẶT HÀNG) */}
      {/* ========================================================================= */}
      {subTab === 'CARD' && (
        <div className="space-y-6">
          {/* Material Selector & Stock Card summary */}
          <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Material Dropdown */}
              <div className="flex-1 max-w-xl">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Chọn Mặt Hàng Để Xem Sổ Thẻ Kho:
                </label>
                <select
                  value={selectedMaterialCode}
                  onChange={(e) => setSelectedMaterialCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-blue-500"
                >
                  {materials.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.code} - {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" /> In Thẻ Kho
                </button>
              </div>
            </div>

            {/* Selected Material Quick Summary Cards */}
            {activeMaterial && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Tồn Đầu Kỳ</span>
                  <strong className="text-sm text-white font-mono">
                    {formatNumber(activeMaterial.initialStock)} {activeMaterial.unit}
                  </strong>
                </div>
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-blue-400 block">Tổng Lượng Nhập</span>
                  <strong className="text-sm text-blue-300 font-mono">
                    +{formatNumber(
                      stockCardEntries.reduce((sum, e) => sum + e.quantityIn, 0)
                    )}{' '}
                    {activeMaterial.unit}
                  </strong>
                </div>
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-amber-400 block">Tổng Lượng Xuất</span>
                  <strong className="text-sm text-amber-300 font-mono">
                    -{formatNumber(
                      stockCardEntries.reduce((sum, e) => sum + e.quantityOut, 0)
                    )}{' '}
                    {activeMaterial.unit}
                  </strong>
                </div>
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-emerald-400 block">Tồn Kho Hiện Tại</span>
                  <strong className="text-sm text-emerald-300 font-mono">
                    {formatNumber(
                      stockCardEntries[stockCardEntries.length - 1]?.balance ??
                        activeMaterial.initialStock
                    )}{' '}
                    {activeMaterial.unit}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Stock Balance Trend Line Chart */}
          <div className="no-print bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  Diễn Biến Tồn Kho Của {activeMaterial?.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Đường cong biến động số lượng tồn sau từng đợt nhập/xuất
                </p>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Tồn kho"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#3b82f6' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stock Card Log Table */}
          <div className="printable-area bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Header for official print / export */}
            <div className="p-6 bg-slate-950/80 border-b border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AHTLogo className="h-10 w-auto" showPlane={false} allowUpload={false} />
                  <div>
                    <div className="text-xs sm:text-sm font-black tracking-wide text-slate-200 uppercase">
                      CÔNG TY CỔ PHẦN ĐẦU TƯ KHAI THÁC NHÀ GA QUỐC TẾ ĐÀ NẴNG
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-400 font-medium">
                      ĐỘI ĐIỆN NƯỚC CÔNG TRÌNH (DOIDNCT)
                    </div>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-[11px] font-bold text-slate-400">Mẫu biểu: Sổ Thẻ Kho</div>
                  <div className="text-[10px] text-slate-500">Mã: {activeMaterial?.code}</div>
                </div>
              </div>

              <div className="pt-4 pb-1 text-center">
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                  THẺ KHO ĐIỆN TỬ CHI TIẾT
                </h2>
                <p className="text-xs font-semibold text-blue-300 mt-1">
                  Vật tư: {activeMaterial?.name} ({activeMaterial?.code}) - ĐVT: {activeMaterial?.unit}
                </p>
                <p className="text-[11px] text-slate-400">
                  Quy cách / Chủng loại: {activeMaterial?.specification || 'Theo tiêu chuẩn kỹ thuật nhà sản xuất'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-850/60 border-b border-slate-800 flex items-center justify-between no-print">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Nhật Ký Chứng Từ Thẻ Kho ({stockCardEntries.length} dòng)
              </span>
              <span className="text-xs text-slate-400 font-mono">{activeMaterial?.code}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">STT</th>
                    <th className="px-3 py-2.5">Ngày</th>
                    <th className="px-3 py-2.5">Số Phiếu</th>
                    <th className="px-3 py-2.5">Nội Dung / Diễn Giải</th>
                    <th className="px-3 py-2.5">Đối Tác</th>
                    <th className="px-3 py-2.5 text-right text-blue-400">Nhập (+)</th>
                    <th className="px-3 py-2.5 text-right text-amber-400">Xuất (-)</th>
                    <th className="px-3 py-2.5 text-right text-emerald-400">Tồn Cuối</th>
                    <th className="px-3 py-2.5 text-right">Đơn Giá</th>
                    <th className="px-3 py-2.5 text-right">Thành Tiền</th>
                    <th className="px-3 py-2.5">Người Thực Hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-xs">
                  {stockCardEntries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-3 py-2 text-slate-500 text-center">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{entry.date}</td>
                      <td className="px-3 py-2 text-blue-400 font-bold whitespace-nowrap">
                        {entry.documentCode}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-200 max-w-xs truncate">
                        {entry.documentTitle}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-400 max-w-[140px] truncate">
                        {entry.partner}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-300 font-semibold">
                        {entry.quantityIn > 0 ? `+${formatNumber(entry.quantityIn)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-amber-300 font-semibold">
                        {entry.quantityOut > 0 ? `-${formatNumber(entry.quantityOut)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-300 font-bold">
                        {formatNumber(entry.balance)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-400">
                        {formatVND(entry.unitPrice)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300 font-semibold">
                        {formatVND(entry.amount)}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-400 text-xs">
                        {entry.operator}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockLedgerView;
