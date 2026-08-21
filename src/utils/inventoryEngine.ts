import {
  Material,
  InventoryTransaction,
  CalculatedMaterialStock,
  StockCardEntry,
  StockSummaryReportItem,
  NaturalSearchFilters,
} from '../types';

/**
 * Validates material code
 */
export function validateMaterialCode(code: string): { isValid: boolean; error?: string; normalized: string } {
  if (!code || !code.trim()) {
    return { isValid: false, error: 'Mã vật tư không được để trống', normalized: '' };
  }
  const trimmed = code.trim().toUpperCase().replace(/\s+/g, '_');
  if (trimmed.length < 3) {
    return {
      isValid: false,
      error: 'Mã vật tư quá ngắn, vui lòng nhập mã chuẩn hóa (tối thiểu 3 ký tự)',
      normalized: trimmed,
    };
  }
  return { isValid: true, normalized: trimmed };
}

/**
 * Format currency VNĐ
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with comma
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Real-time automatic inventory calculation
 * Tồn kho hiện tại = Tồn đầu kỳ + Tổng Nhập (đã duyệt) - Tổng Xuất (đã duyệt)
 */
export function calculateAllMaterialStocks(
  materials: Material[],
  transactions: InventoryTransaction[]
): CalculatedMaterialStock[] {
  // Extract all approved items
  const approvedTx = transactions.filter((t) => t.status === 'APPROVED');
  const pendingTx = transactions.filter((t) => t.status === 'PENDING');

  return materials.map((mat) => {
    let totalImported = 0;
    let totalExported = 0;
    let pendingImport = 0;
    let pendingExport = 0;

    // Calculate approved movements
    for (const tx of approvedTx) {
      for (const item of tx.items) {
        if (item.materialCode === mat.code) {
          if (tx.type === 'IMPORT') {
            totalImported += item.quantity;
          } else if (tx.type === 'EXPORT') {
            totalExported += item.quantity;
          }
        }
      }
    }

    // Calculate pending movements
    for (const tx of pendingTx) {
      for (const item of tx.items) {
        if (item.materialCode === mat.code) {
          if (tx.type === 'IMPORT') {
            pendingImport += item.quantity;
          } else if (tx.type === 'EXPORT') {
            pendingExport += item.quantity;
          }
        }
      }
    }

    const currentStock = mat.initialStock + totalImported - totalExported;
    const availableStock = currentStock - pendingExport;
    const totalValue = Math.max(0, currentStock) * mat.unitPrice;

    let stockStatus: CalculatedMaterialStock['stockStatus'] = 'OPTIMAL';
    if (currentStock <= 0) {
      stockStatus = 'OUT_OF_STOCK';
    } else if (currentStock <= mat.minStock) {
      stockStatus = 'LOW_STOCK';
    } else if (currentStock >= mat.maxStock) {
      stockStatus = 'OVER_STOCK';
    }

    return {
      ...mat,
      totalImported,
      totalExported,
      currentStock,
      pendingImport,
      pendingExport,
      availableStock,
      totalValue,
      stockStatus,
    };
  });
}

/**
 * Generate Stock Card (Sổ Thẻ Kho) for a specific material
 */
export function generateStockCard(
  materialCode: string,
  materials: Material[],
  transactions: InventoryTransaction[]
): StockCardEntry[] {
  const material = materials.find((m) => m.code === materialCode);
  if (!material) return [];

  const entries: StockCardEntry[] = [];
  let currentBalance = material.initialStock;

  // Initial balance entry
  entries.push({
    id: `card-init-${materialCode}`,
    date: '2026-08-01',
    documentCode: 'TON-DAU-KY',
    documentType: 'IMPORT',
    documentTitle: 'Số dư tồn kho đầu kỳ',
    partner: 'Kho vận nội bộ',
    quantityIn: material.initialStock,
    quantityOut: 0,
    balance: currentBalance,
    unitPrice: material.unitPrice,
    amount: currentBalance * material.unitPrice,
    operator: 'Hệ thống khởi tạo',
    notes: 'Số dư ban đầu ghi nhận tại ngày 01/08/2026',
  });

  // Find all approved transactions containing this material, sorted by date
  const relevantApprovedTx = transactions
    .filter((tx) => tx.status === 'APPROVED' && tx.items.some((i) => i.materialCode === materialCode))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const tx of relevantApprovedTx) {
    const item = tx.items.find((i) => i.materialCode === materialCode);
    if (!item) continue;

    const qtyIn = tx.type === 'IMPORT' ? item.quantity : 0;
    const qtyOut = tx.type === 'EXPORT' ? item.quantity : 0;

    currentBalance = currentBalance + qtyIn - qtyOut;

    entries.push({
      id: `card-${tx.id}-${materialCode}`,
      date: tx.date,
      documentCode: tx.code,
      documentType: tx.type,
      documentTitle: tx.title,
      partner: tx.partner,
      quantityIn: qtyIn,
      quantityOut: qtyOut,
      balance: currentBalance,
      unitPrice: item.unitPrice || material.unitPrice,
      amount: (qtyIn || qtyOut) * (item.unitPrice || material.unitPrice),
      operator: tx.approverName || tx.creatorName,
      notes: tx.reason,
    });
  }

  return entries;
}

/**
 * Generate Summary Report Nhập - Xuất - Tồn
 */
export function generateStockSummaryReport(
  materials: Material[],
  transactions: InventoryTransaction[],
  startDate?: string,
  endDate?: string
): StockSummaryReportItem[] {
  const calculated = calculateAllMaterialStocks(materials, transactions);

  return calculated.map((item) => {
    // Filter transactions in range if specified
    const inRangeApprovedTx = transactions.filter((tx) => {
      if (tx.status !== 'APPROVED') return false;
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    });

    let periodImportQty = 0;
    let periodExportQty = 0;

    for (const tx of inRangeApprovedTx) {
      for (const tItem of tx.items) {
        if (tItem.materialCode === item.code) {
          if (tx.type === 'IMPORT') periodImportQty += tItem.quantity;
          if (tx.type === 'EXPORT') periodExportQty += tItem.quantity;
        }
      }
    }

    const openingStock = item.initialStock;
    const openingValue = openingStock * item.unitPrice;
    const periodImportValue = periodImportQty * item.unitPrice;
    const periodExportValue = periodExportQty * item.unitPrice;
    const closingStock = item.currentStock;
    const closingValue = closingStock * item.unitPrice;

    return {
      materialCode: item.code,
      materialName: item.name,
      unit: item.unit,
      category: item.category,
      openingStock,
      openingValue,
      periodImportQty,
      periodImportValue,
      periodExportQty,
      periodExportValue,
      closingStock,
      closingValue,
      unitPrice: item.unitPrice,
    };
  });
}

/**
 * Natural Language Query Parser (Client-side fast matching)
 */
export function parseNaturalLanguageQuery(
  rawQuery: string,
  categories: string[]
): {
  filters: NaturalSearchFilters;
  explanation: string;
  matchedCountHint?: string;
} {
  const q = rawQuery.toLowerCase().trim();
  const filters: NaturalSearchFilters = {};
  const reasons: string[] = [];

  if (!q) {
    return { filters, explanation: 'Hiển thị tất cả vật tư' };
  }

  // Check code prefix / exact code
  if (q.includes('dn_') || q.includes('dn-')) {
    const codeMatch = q.match(/dn[_\-][a-z0-9_]+/i);
    if (codeMatch) {
      filters.searchKeyword = codeMatch[0].toUpperCase().replace('-', '_');
      reasons.push(`Lọc theo mã vật tư "${filters.searchKeyword}"`);
    }
  }

  // Stock status checks
  if (
    q.includes('hết hàng') ||
    q.includes('hết tồn') ||
    q.includes('bằng 0') ||
    q.includes('tồn 0')
  ) {
    filters.stockStatus = 'OUT_OF_STOCK';
    reasons.push('Lọc vật tư đã hết hàng (Tồn = 0)');
  } else if (
    q.includes('sắp hết') ||
    q.includes('dưới định mức') ||
    q.includes('cảnh báo') ||
    q.includes('thiếu hụt') ||
    q.includes('an toàn') ||
    q.includes('cần nhập') ||
    q.includes('bổ sung')
  ) {
    filters.stockStatus = 'LOW_STOCK';
    reasons.push('Lọc vật tư sắp hết (Dưới hoặc bằng định mức an toàn tối thiểu)');
  } else if (q.includes('dư thừa') || q.includes('tồn cao') || q.includes('vượt mức')) {
    filters.stockStatus = 'OVER_STOCK';
    reasons.push('Lọc vật tư tồn kho cao vượt định mức');
  }

  // Check category matches
  for (const cat of categories) {
    const catLower = cat.toLowerCase();
    const keywords = catLower.split(/[\s,&]+/);
    const hasMatch = keywords.some((k) => k.length > 2 && q.includes(k));
    if (hasMatch) {
      filters.category = cat;
      reasons.push(`Nhóm: "${cat}"`);
      break;
    }
  }

  // Check common material keywords if no category matched yet
  if (!filters.category) {
    if (q.includes('cáp') || q.includes('dây điện') || q.includes('cadivi') || q.includes('cxv')) {
      filters.category = 'Dây & Cáp điện lực hạ thế';
      reasons.push('Nhóm Dây & Cáp điện');
    } else if (q.includes('máy cắt') || q.includes('acb') || q.includes('mccb') || q.includes('contactor') || q.includes('tủ điện')) {
      filters.category = 'Thiết bị đóng cắt & Tủ điện';
      reasons.push('Nhóm Thiết bị đóng cắt');
    } else if (q.includes('van') || q.includes('khí nén') || q.includes('thủy lực') || q.includes('lọc')) {
      filters.category = 'Thiết bị khí nén & Thủy lực';
      reasons.push('Nhóm Khí nén & Thủy lực');
    } else if (q.includes('bulong') || q.includes('ty ren') || q.includes('ốc') || q.includes('kim khí')) {
      filters.category = 'Vật tư phụ & Kim khí';
      reasons.push('Nhóm Kim khí & Vật tư phụ');
    } else if (q.includes('bảo hộ') || q.includes('mũ') || q.includes('găng tay') || q.includes('an toàn')) {
      filters.category = 'Bảo hộ & An toàn lao động';
      reasons.push('Nhóm Bảo hộ lao động');
    } else if (q.includes('cảm biến') || q.includes('đồng hồ') || q.includes('đo lường')) {
      filters.category = 'Thiết bị đo lường & Cảm biến';
      reasons.push('Nhóm Thiết bị đo lường');
    } else if (q.includes('bạc đạn') || q.includes('vòng bi') || q.includes('curoa') || q.includes('dây đai')) {
      filters.category = 'Truyền động & Bạc đạn';
      reasons.push('Nhóm Truyền động & Bạc đạn');
    }
  }

  // General keyword fallback
  if (!filters.searchKeyword && !filters.stockStatus && !filters.category) {
    filters.searchKeyword = rawQuery.trim();
    reasons.push(`Tìm kiếm theo từ khóa "${rawQuery}"`);
  }

  return {
    filters,
    explanation: reasons.length > 0 ? reasons.join(' • ') : `Tìm kiếm "${rawQuery}"`,
  };
}

/**
 * Formats YYYY-MM-DD or ISO string to DD/MM/YYYY
 */
export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('vi-VN');
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1].padStart(2, '0');
    const day = parts[2].slice(0, 2).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

