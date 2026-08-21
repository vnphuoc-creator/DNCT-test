import React, { useState, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Filter,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  ArrowUpDown,
  Edit2,
  Trash2,
  X,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Info,
  Archive,
} from 'lucide-react';
import {
  Material,
  CalculatedMaterialStock,
  User,
  NaturalSearchFilters,
} from '../types';
import { formatVND, formatNumber, validateMaterialCode } from '../utils/inventoryEngine';
import { MATERIAL_CATEGORIES, STANDARD_UNITS } from '../data/seedData';
import { exportMaterialCatalogueToExcel } from '../utils/excelExporter';

interface MaterialCatalogueViewProps {
  currentUser: User;
  allUsers: User[];
  materials: Material[];
  calculatedStocks: CalculatedMaterialStock[];
  onSaveMaterial: (material: Material) => void;
  onDeleteMaterial: (materialId: string) => void;
  onOpenStockCard: (materialCode: string) => void;
  onOpenCreateTransaction: (type: 'IMPORT' | 'EXPORT', preselectedMaterialCode?: string) => void;
  appliedFilters: NaturalSearchFilters | null;
  filterExplanation: string | null;
  onClearFilters: () => void;
}

export const MaterialCatalogueView: React.FC<MaterialCatalogueViewProps> = ({
  currentUser,
  allUsers,
  materials,
  calculatedStocks,
  onSaveMaterial,
  onDeleteMaterial,
  onOpenStockCard,
  onOpenCreateTransaction,
  appliedFilters,
  filterExplanation,
  onClearFilters,
}) => {
  const [searchTerm, setSearchTerm] = useState(appliedFilters?.searchKeyword || '');
  const [selectedCategory, setSelectedCategory] = useState(appliedFilters?.category || 'ALL');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState(appliedFilters?.stockStatus || 'ALL');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'stock' | 'value'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal State for adding/editing material
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<Partial<Material>>({
    code: '',
    name: '',
    category: MATERIAL_CATEGORIES[0],
    unit: 'Cái',
    specification: '',
    location: 'Kho Tổng',
    initialStock: 0,
    minStock: 5,
    maxStock: 50,
    unitPrice: 100000,
    allocatedStaffEmails: [],
    notes: '',
  });
  const [codeError, setCodeError] = useState<string | null>(null);

  // Available unique units in current database
  const availableUnits = useMemo(() => {
    const units = new Set<string>(materials.map((m) => m.unit).filter(Boolean));
    STANDARD_UNITS.forEach((u) => units.add(u));
    return Array.from(units);
  }, [materials]);

  // Real-time category counts for dropdown and quick filters
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    MATERIAL_CATEGORIES.forEach((cat) => {
      map[cat] = materials.filter((m) => m.category === cat).length;
    });
    return map;
  }, [materials]);

  // Sync external filters
  React.useEffect(() => {
    if (appliedFilters) {
      if (appliedFilters.searchKeyword !== undefined) setSearchTerm(appliedFilters.searchKeyword);
      if (appliedFilters.category !== undefined) setSelectedCategory(appliedFilters.category);
      if (appliedFilters.stockStatus !== undefined) setSelectedStatus(appliedFilters.stockStatus);
    }
  }, [appliedFilters]);

  // Filter and Sort Materials
  const filteredMaterials = useMemo(() => {
    return calculatedStocks
      .filter((mat) => {
        // Search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matchCode = mat.code.toLowerCase().includes(term);
          const matchName = mat.name.toLowerCase().includes(term);
          const matchSpec = mat.specification.toLowerCase().includes(term);
          const matchLocation = mat.location.toLowerCase().includes(term);
          if (!matchCode && !matchName && !matchSpec && !matchLocation) return false;
        }

        // Category filter
        if (selectedCategory !== 'ALL' && mat.category !== selectedCategory) {
          return false;
        }

        // Unit filter
        if (selectedUnit !== 'ALL' && mat.unit.toLowerCase() !== selectedUnit.toLowerCase()) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'ALL') {
          if (selectedStatus === 'LOW_STOCK' && mat.stockStatus !== 'LOW_STOCK' && mat.stockStatus !== 'OUT_OF_STOCK') {
            return false;
          }
          if (selectedStatus === 'OUT_OF_STOCK' && mat.stockStatus !== 'OUT_OF_STOCK') {
            return false;
          }
          if (selectedStatus === 'OVER_STOCK' && mat.stockStatus !== 'OVER_STOCK') {
            return false;
          }
          if (selectedStatus === 'OPTIMAL' && mat.stockStatus !== 'OPTIMAL') {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'code') cmp = a.code.localeCompare(b.code);
        else if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortBy === 'stock') cmp = a.currentStock - b.currentStock;
        else if (sortBy === 'value') cmp = a.totalValue - b.totalValue;
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [calculatedStocks, searchTerm, selectedCategory, selectedUnit, selectedStatus, sortBy, sortOrder]);

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setFormData({
      code: '',
      name: '',
      category: MATERIAL_CATEGORIES[0],
      unit: 'Cái',
      specification: '',
      location: 'Kho Tổng (Kệ A1)',
      initialStock: 10,
      minStock: 5,
      maxStock: 50,
      unitPrice: 500000,
      allocatedStaffEmails: [],
      notes: '',
    });
    setCodeError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mat: Material) => {
    setEditingMaterial(mat);
    setFormData({ ...mat });
    setCodeError(null);
    setIsModalOpen(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateMaterialCode(formData.code || '');
    if (!validation.isValid) {
      setCodeError(validation.error || 'Mã vật tư không hợp lệ');
      return;
    }

    // Check duplicate code if creating new
    if (!editingMaterial) {
      const exists = materials.some((m) => m.code === validation.normalized);
      if (exists) {
        setCodeError(`Mã vật tư ${validation.normalized} đã tồn tại trong hệ thống!`);
        return;
      }
    }

    const materialToSave: Material = {
      id: editingMaterial ? editingMaterial.id : `mat-${Date.now()}`,
      code: validation.normalized,
      name: formData.name?.trim() || 'Vật tư mới',
      category: formData.category || MATERIAL_CATEGORIES[0],
      unit: formData.unit || 'Cái',
      specification: formData.specification || '',
      location: formData.location || 'Kho Tổng',
      initialStock: Number(formData.initialStock) || 0,
      minStock: Number(formData.minStock) || 0,
      maxStock: Number(formData.maxStock) || 100,
      unitPrice: Number(formData.unitPrice) || 0,
      allocatedStaffEmails: formData.allocatedStaffEmails || [],
      notes: formData.notes || '',
      updatedAt: new Date().toISOString().split('T')[0],
    };

    onSaveMaterial(materialToSave);
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    // Export with high-grade corporate excel styling
    exportMaterialCatalogueToExcel(filteredMaterials);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header section with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Danh Mục Vật Tư</h1>
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
              {filteredMaterials.length} / {materials.length} mã
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Định mức tồn kho an toàn &bull; Tự động tính Tồn = Đầu + Nhập - Xuất
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            id="btn-export-materials-csv"
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Xuất file Excel báo cáo danh mục và định mức vật tư chuẩn AHT"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Xuất Excel Danh Mục</span>
          </button>

          {currentUser.role === 'ADMIN' ? (
            <button
              id="btn-add-new-material"
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm Vật Tư Mới</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenCreateTransaction('IMPORT')}
              className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Nhân viên có quyền lập đề xuất nhập vật tư"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>+ Đề Xuất Nhập Thêm</span>
            </button>
          )}
        </div>
      </div>

      {/* Applied Filter Banner if any */}
      {filterExplanation && (
        <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-3 flex items-center justify-between gap-2 text-xs text-blue-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Bộ lọc ngôn ngữ tự nhiên đang áp dụng: <strong>{filterExplanation}</strong>
            </span>
          </div>
          <button
            onClick={onClearFilters}
            className="text-xs text-blue-300 hover:text-white underline shrink-0"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Filter and search toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã vật tư, tên, quy cách, vị trí..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="ALL">Tất cả nhóm vật tư ({materials.length})</option>
              {MATERIAL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({categoryCounts[cat] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Unit Filter Dropdown */}
          <div>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Tất cả đơn vị tính (ĐVT)</option>
              {availableUnits.map((u) => (
                <option key={u} value={u}>
                  ĐVT: {u}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Alert Status Dropdown */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Tất cả trạng thái tồn</option>
              <option value="LOW_STOCK">⚠️ Dưới định mức tối thiểu</option>
              <option value="OUT_OF_STOCK">🚫 Hết hàng (Tồn = 0)</option>
              <option value="OPTIMAL">✅ Tồn kho an toàn</option>
              <option value="OVER_STOCK">📦 Vượt định mức tối đa</option>
            </select>
          </div>
        </div>

        {/* Sort and Quick Unit Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Lọc nhanh ĐVT:</span>
            {['ALL', 'Cái', 'Mét', 'Bộ', 'Cây', 'Cuộn', 'Hộp', 'Bình', 'Kg', 'Lít', 'Bao', 'Can', 'Thùng'].map((u) => (
              <button
                key={u}
                onClick={() => setSelectedUnit(u)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors ${
                  selectedUnit === u
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {u === 'ALL' ? 'Tất cả' : u}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="code">Sắp xếp: Mã vật tư</option>
              <option value="name">Sắp xếp: Tên vật tư</option>
              <option value="stock">Sắp xếp: Số lượng tồn</option>
              <option value="value">Sắp xếp: Giá trị tồn kho</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white"
              title="Đảo chiều sắp xếp"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-850 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Mã Vật Tư</th>
                <th className="py-3.5 px-4 min-w-[220px]">Tên & Quy Cách Vật Tư</th>
                <th className="py-3.5 px-3">Nhóm / Vị Trí</th>
                <th className="py-3.5 px-3 text-center">ĐVT</th>
                <th className="py-3.5 px-3 text-right">Tồn Đầu</th>
                <th className="py-3.5 px-3 text-right text-blue-400">Đã Nhập</th>
                <th className="py-3.5 px-3 text-right text-amber-400">Đã Xuất</th>
                <th className="py-3.5 px-3 text-right font-bold text-white bg-slate-800/40">
                  Tồn Hiện Tại
                </th>
                <th className="py-3.5 px-3 text-right">Đơn Giá</th>
                <th className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                  Tổng Giá Trị
                </th>
                <th className="py-3.5 px-3 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-normal">
              {filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    Không tìm thấy vật tư nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((mat) => {
                  const isLow = mat.stockStatus === 'LOW_STOCK' || mat.stockStatus === 'OUT_OF_STOCK';
                  return (
                    <tr
                      key={mat.id}
                      className="hover:bg-slate-800/60 transition-colors group"
                    >
                      {/* Material Code */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        <span className="bg-blue-950/80 border border-blue-800/70 px-2 py-0.5 rounded text-[11px]">
                          {mat.code}
                        </span>
                      </td>

                      {/* Name & Specification */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white text-xs">{mat.name}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5" title={mat.specification}>
                          {mat.specification}
                        </div>
                      </td>

                      {/* Category & Location */}
                      <td className="py-3 px-3">
                        <div className="text-slate-300 text-[11px]">{mat.category}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                          {mat.location}
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-3 text-center font-medium text-slate-300">
                        {mat.unit}
                      </td>

                      {/* Initial Stock */}
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {formatNumber(mat.initialStock)}
                      </td>

                      {/* Total In */}
                      <td className="py-3 px-3 text-right font-mono text-blue-400">
                        +{formatNumber(mat.totalImported)}
                      </td>

                      {/* Total Out */}
                      <td className="py-3 px-3 text-right font-mono text-amber-400">
                        -{formatNumber(mat.totalExported)}
                      </td>

                      {/* Current Calculated Stock */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-sm bg-slate-800/40">
                        <span
                          className={
                            mat.currentStock <= 0
                              ? 'text-rose-400'
                              : mat.currentStock <= mat.minStock
                              ? 'text-amber-400'
                              : 'text-white'
                          }
                        >
                          {formatNumber(mat.currentStock)}
                        </span>
                        {mat.pendingExport > 0 && (
                          <div className="text-[10px] text-amber-400 font-sans font-normal">
                            (Chờ xuất: {mat.pendingExport})
                          </div>
                        )}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-3 text-right font-mono text-slate-400 text-[11px]">
                        {formatVND(mat.unitPrice)}
                      </td>

                      {/* Total Value */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                        {formatVND(mat.totalValue)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {mat.stockStatus === 'OUT_OF_STOCK' && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-medium">
                            <AlertCircle className="w-3 h-3" /> Hết hàng
                          </span>
                        )}
                        {mat.stockStatus === 'LOW_STOCK' && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                            <AlertTriangle className="w-3 h-3" /> Cảnh báo min
                          </span>
                        )}
                        {mat.stockStatus === 'OVER_STOCK' && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
                            Tồn vượt max
                          </span>
                        )}
                        {mat.stockStatus === 'OPTIMAL' && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="w-3 h-3" /> An toàn
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-stock-card-${mat.code}`}
                            onClick={() => onOpenStockCard(mat.code)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition-colors"
                            title="Xem Sổ Thẻ Kho chi tiết"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`btn-quick-export-${mat.code}`}
                            onClick={() => onOpenCreateTransaction('EXPORT', mat.code)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-900/40 text-amber-400 hover:text-amber-300 transition-colors"
                            title="Tạo đề xuất xuất vật tư này"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          {currentUser.role === 'ADMIN' && (
                            <>
                              <button
                                id={`btn-edit-mat-${mat.id}`}
                                onClick={() => handleOpenEdit(mat)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                title="Chỉnh sửa định mức & thông tin"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id={`btn-delete-mat-${mat.id}`}
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Bạn có chắc muốn xóa vật tư "${mat.code} - ${mat.name}"?`
                                    )
                                  ) {
                                    onDeleteMaterial(mat.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-colors"
                                title="Xóa vật tư"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Material */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingMaterial ? 'Chỉnh Sửa Vật Tư' : 'Thêm Vật Tư Mới Vào Danh Mục'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Nhập mã và thông tin chi tiết vật tư
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Material Code */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Mã Vật Tư <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => {
                    setFormData({ ...formData, code: e.target.value.toUpperCase() });
                    setCodeError(null);
                  }}
                  placeholder="Ví dụ: VT_001, O25_01, MKC_02"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm uppercase focus:outline-none focus:border-blue-500"
                  required
                />
                {codeError && <p className="text-rose-400 text-[11px] mt-1 font-medium">{codeError}</p>}
              </div>

              {/* Material Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Tên Vật Tư <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Máy cắt không khí ACB 3P 2000A 65kA"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nhóm Ngành Hàng</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {MATERIAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit Dropdown */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Đơn Vị Tính (ĐVT) <span className="text-rose-400">*</span>
                  </label>
                  <div className="space-y-2">
                    <select
                      value={
                        STANDARD_UNITS.includes(formData.unit)
                          ? formData.unit
                          : formData.unit
                          ? '__CUSTOM__'
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__CUSTOM__') {
                          setFormData({ ...formData, unit: '' });
                        } else {
                          setFormData({ ...formData, unit: val });
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm font-medium"
                      required
                    >
                      <option value="" disabled>
                        -- Chọn đơn vị tính (Xả mũi tên để chọn) --
                      </option>
                      {STANDARD_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value="__CUSTOM__">+ Nhập đơn vị tính khác...</option>
                    </select>

                    {/* If custom unit is selected or not in STANDARD_UNITS */}
                    {(!STANDARD_UNITS.includes(formData.unit) || formData.unit === '') && (
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        placeholder="Nhập tên đơn vị tính khác (ví dụ: mét dài, thanh 6m...)"
                        className="w-full bg-slate-800/90 border border-blue-500/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                        required
                        autoFocus
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Specification */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Quy Cách & Tiêu Chuẩn Kỹ Thuật</label>
                <input
                  type="text"
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  placeholder="Hãng sản xuất, model, cấp điện áp, kích thước, tiêu chuẩn IEC/DIN..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Location */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Vị Trí Lưu Kho</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Kệ A1-01, Kho Tổng..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Initial Stock */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tồn Ban Đầu (Đầu Kỳ)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.initialStock}
                    onChange={(e) =>
                      setFormData({ ...formData, initialStock: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Đơn Giá Tiêu Chuẩn (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.unitPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, unitPrice: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Min Stock */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Định Mức Tồn Tối Thiểu (Ngưỡng An Toàn)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Khi tồn &le; min hệ thống sẽ kích hoạt cảnh báo</p>
                </div>

                {/* Max Stock */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Định Mức Tồn Tối Đa (Max)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxStock}
                    onChange={(e) =>
                      setFormData({ ...formData, maxStock: Math.max(0, parseInt(e.target.value) || 0) })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Ghi Chú Kỹ Thuật / Lưu Ý Kho</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Lưu ý về bảo quản, hạn sử dụng, đặc thù công trình..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  id="btn-save-material-submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30"
                >
                  {editingMaterial ? 'Cập Nhật Vật Tư' : 'Lưu Vào Danh Mục'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
