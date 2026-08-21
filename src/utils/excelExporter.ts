import * as XLSX from 'xlsx';
import { Material, InventoryTransaction } from '../types';

export interface ReportDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  periodLabel: string;
}

export interface DetailedStockReportItem {
  code: string;
  name: string;
  unit: string;
  category: string;
  unitPrice: number;
  openingQty: number;
  openingValue: number;
  importQty: number;
  importValue: number;
  exportQty: number;
  exportValue: number;
  closingQty: number;
  closingValue: number;
  lastImportDate: string;
}

export function calculateDateRangeReportData(
  materials: Material[],
  transactions: InventoryTransaction[],
  startDate: string,
  endDate: string,
  proposalNumber?: string
): DetailedStockReportItem[] {
  let approvedTx = transactions.filter((t) => t.status === 'APPROVED');

  if (proposalNumber && proposalNumber !== 'ALL') {
    approvedTx = approvedTx.filter((t) => t.proposalNumber === proposalNumber);
  }

  return materials.map((mat) => {
    let openingQty = mat.initialStock;

    // Adjust opening stock by transactions before startDate
    approvedTx.forEach((tx) => {
      if (tx.date < startDate) {
        tx.items.forEach((item) => {
          if (item.materialCode === mat.code) {
            if (tx.type === 'IMPORT') {
              openingQty += item.quantity;
            } else if (tx.type === 'EXPORT') {
              openingQty -= item.quantity;
            }
          }
        });
      }
    });

    let importQty = 0;
    let importValue = 0;
    let exportQty = 0;
    let exportValue = 0;
    let lastImportDate = '';

    // Transactions within the period [startDate, endDate]
    approvedTx.forEach((tx) => {
      if (tx.date >= startDate && tx.date <= endDate) {
        tx.items.forEach((item) => {
          if (item.materialCode === mat.code) {
            const price = item.unitPrice > 0 ? item.unitPrice : mat.unitPrice;
            if (tx.type === 'IMPORT') {
              importQty += item.quantity;
              importValue += item.quantity * price;
              if (!lastImportDate || tx.date > lastImportDate) {
                lastImportDate = tx.date;
              }
            } else if (tx.type === 'EXPORT') {
              exportQty += item.quantity;
              exportValue += item.quantity * price;
            }
          }
        });
      }
    });

    // If no import in current period, find the overall latest import date
    if (!lastImportDate) {
      approvedTx.forEach((tx) => {
        if (tx.type === 'IMPORT') {
          tx.items.forEach((item) => {
            if (item.materialCode === mat.code) {
              if (!lastImportDate || tx.date > lastImportDate) {
                lastImportDate = tx.date;
              }
            }
          });
        }
      });
    }

    const openingValue = openingQty * mat.unitPrice;
    const closingQty = openingQty + importQty - exportQty;
    const closingValue = closingQty * mat.unitPrice;

    // Format last import date as DD/MM/YYYY if present
    let formattedLastDate = '-';
    if (lastImportDate) {
      const parts = lastImportDate.split('-');
      if (parts.length === 3) {
        formattedLastDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        formattedLastDate = lastImportDate;
      }
    }

    return {
      code: mat.code,
      name: mat.name,
      unit: mat.unit,
      category: mat.category,
      unitPrice: mat.unitPrice,
      openingQty,
      openingValue,
      importQty,
      importValue,
      exportQty,
      exportValue,
      closingQty,
      closingValue,
      lastImportDate: formattedLastDate,
    };
  });
}

/**
 * Exports data into authentic Excel (.xlsx) file matching the exact corporate template
 */
export function exportToOfficialExcel(
  items: DetailedStockReportItem[],
  startDate: string,
  endDate: string,
  warehouseName = 'DOIDNCT: Đội Điện nước công trình-DOIDNCT',
  proposalNumber?: string
) {
  // Format dates to DD/MM/YYYY
  const formatVNDate = (dStr: string) => {
    const p = dStr.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : dStr;
  };

  const fromDateStr = formatVNDate(startDate);
  const toDateStr = formatVNDate(endDate);
  const today = new Date();
  const reportDateStr = `Đà Nẵng, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;

  // Calculate Subtotals
  const totals = items.reduce(
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

  // Construct Array of Arrays (aoa)
  const aoa: any[][] = [];

  // Row 1 (Index 0): Company Name
  aoa.push(['CÔNG TY CỔ PHẦN ĐẦU TƯ KHAI THÁC NHÀ GA QUỐC TẾ ĐÀ NẴNG (AHT)']);
  // Row 2 (Index 1): Department
  aoa.push(['ĐỘI ĐIỆN NƯỚC CÔNG TRÌNH - DOIDNCT']);
  // Row 3 (Index 2): Blank
  aoa.push([]);
  // Row 4 (Index 3): Title
  aoa.push(['', '', '', '', 'BÁO CÁO TỔNG HỢP NHẬP - XUẤT - TỒN']);
  // Row 5 (Index 4): Period Date Range
  aoa.push(['', '', '', '', `Từ ngày ${fromDateStr} đến ngày ${toDateStr}`]);
  // Row 6 (Index 5): Warehouse & Proposal Number
  aoa.push([
    '',
    '',
    '',
    '',
    `Kho hàng: ${warehouseName}${proposalNumber && proposalNumber !== 'ALL' ? ` | Tờ trình: ${proposalNumber}` : ''}`,
  ]);
  // Row 7 (Index 6): Blank
  aoa.push([]);

  // Row 8 (Index 7): Header Main Row
  aoa.push([
    'Mã số',
    'Mặt hàng',
    'Đvt',
    'Đầu kỳ',
    '',
    'Nhập',
    '',
    'Xuất',
    '',
    'Cuối kỳ',
    '',
    'Ngày nhập cuối',
  ]);

  // Row 9 (Index 8): Header Sub Row
  aoa.push([
    '',
    '',
    '',
    'Số lượng',
    'Giá trị (VNĐ)',
    'Số lượng',
    'Giá trị (VNĐ)',
    'Số lượng',
    'Giá trị (VNĐ)',
    'Số lượng',
    'Giá trị (VNĐ)',
    '',
  ]);

  // Row 10 (Index 9): Summary Category Total Row (VẬT TƯ ĐỘI ĐIỆN NƯỚC)
  aoa.push([
    '',
    'TỔNG CỘNG VẬT TƯ ĐỘI ĐIỆN NƯỚC',
    '',
    totals.openingQty,
    totals.openingValue,
    totals.importQty,
    totals.importValue,
    totals.exportQty,
    totals.exportValue,
    totals.closingQty,
    totals.closingValue,
    '',
  ]);

  // Group by category
  const categories = Array.from(new Set(items.map((i) => i.category)));

  categories.forEach((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    const catTotals = catItems.reduce(
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

    // Group Subheader
    aoa.push([
      '',
      `[NHÓM] ${cat.toUpperCase()}`,
      '',
      catTotals.openingQty,
      catTotals.openingValue,
      catTotals.importQty,
      catTotals.importValue,
      catTotals.exportQty,
      catTotals.exportValue,
      catTotals.closingQty,
      catTotals.closingValue,
      '',
    ]);

    // Items under group
    catItems.forEach((item) => {
      aoa.push([
        item.code,
        item.name,
        item.unit,
        item.openingQty,
        item.openingValue,
        item.importQty,
        item.importValue,
        item.exportQty,
        item.exportValue,
        item.closingQty,
        item.closingValue,
        item.lastImportDate,
      ]);
    });
  });

  // Blank lines before signature
  aoa.push([]);
  aoa.push(['', '', '', '', '', '', '', '', '', reportDateStr]);
  aoa.push([]);
  // Signatures Row 1 - ONLY 2 Columns
  aoa.push([
    'NGƯỜI LẬP BIỂU',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'QUẢN LÝ / PHÊ DUYỆT',
  ]);
  // Signatures Note
  aoa.push([
    '(Ký, họ tên)',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '(Ký, đóng dấu)',
  ]);
  aoa.push([]);
  aoa.push([]);
  aoa.push([]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Define merges
  ws['!merges'] = [
    // Header title row 4: A4 to L4
    { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } },
    // Period row 5: A5:L5
    { s: { r: 4, c: 0 }, e: { r: 4, c: 11 } },
    // Warehouse row 6: A6:L6
    { s: { r: 5, c: 0 }, e: { r: 5, c: 11 } },

    // Table Headers
    // Mã số (A8:A9)
    { s: { r: 7, c: 0 }, e: { r: 8, c: 0 } },
    // Mặt hàng (B8:B9)
    { s: { r: 7, c: 1 }, e: { r: 8, c: 1 } },
    // Đvt (C8:C9)
    { s: { r: 7, c: 2 }, e: { r: 8, c: 2 } },
    // Đầu kỳ (D8:E8)
    { s: { r: 7, c: 3 }, e: { r: 7, c: 4 } },
    // Nhập (F8:G8)
    { s: { r: 7, c: 5 }, e: { r: 7, c: 6 } },
    // Xuất (H8:I8)
    { s: { r: 7, c: 7 }, e: { r: 7, c: 8 } },
    // Cuối kỳ (J8:K8)
    { s: { r: 7, c: 9 }, e: { r: 7, c: 10 } },
    // Ngày nhập cuối (L8:L9)
    { s: { r: 7, c: 11 }, e: { r: 8, c: 11 } },
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 20 }, // A: Mã số
    { wch: 42 }, // B: Mặt hàng
    { wch: 10 }, // C: Đvt
    { wch: 14 }, // D: SL Đầu kỳ
    { wch: 18 }, // E: GT Đầu kỳ
    { wch: 14 }, // F: SL Nhập
    { wch: 18 }, // G: GT Nhập
    { wch: 14 }, // H: SL Xuất
    { wch: 18 }, // I: GT Xuất
    { wch: 14 }, // J: SL Cuối kỳ
    { wch: 20 }, // K: GT Cuối kỳ
    { wch: 16 }, // L: Ngày nhập cuối
  ];

  // Create workbook and write file
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bao_Cao_NXT_AHT');

  const fileName = `Bao_Cao_NXT_AHT_Dien_Nuoc_${startDate.replace(/-/g, '')}_${endDate.replace(/-/g, '')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export Material Catalogue with full specifications, current stock and valuation into formatted Excel
 */
export function exportMaterialCatalogueToExcel(
  materials: {
    code: string;
    name: string;
    specification: string;
    category: string;
    unit: string;
    location: string;
    initialStock: number;
    totalImported: number;
    totalExported: number;
    currentStock: number;
    minStock: number;
    maxStock: number;
    unitPrice: number;
    totalValue: number;
    stockStatus: string;
  }[]
) {
  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

  const aoa: any[][] = [];

  // Header rows
  aoa.push(['CÔNG TY CỔ PHẦN ĐẦU TƯ KHAI THÁC NHÀ GA QUỐC TẾ ĐÀ NẴNG (AHT)']);
  aoa.push(['ĐỘI ĐIỆN NƯỚC CÔNG TRÌNH - HỆ THỐNG QUẢN LÝ KHO THÔNG MINH']);
  aoa.push([]);
  aoa.push(['', '', '', '', 'DANH MỤC VẬT TƯ & ĐỊNH MỨC TỒN KHO']);
  aoa.push(['', '', '', '', `Ngày kết xuất: ${dateStr}`]);
  aoa.push([]);

  // Table header
  aoa.push([
    'STT',
    'Mã Vật Tư',
    'Tên Vật Tư',
    'Quy Cách & Tiêu Chuẩn Kỹ Thuật',
    'Nhóm Ngành Hàng',
    'ĐVT',
    'Vị Trí Kho',
    'Tồn Đầu Kỳ',
    'Tổng Đã Nhập',
    'Tổng Đã Xuất',
    'Tồn Hiện Tại',
    'Định Mức Min',
    'Định Mức Max',
    'Đơn Giá Dự Toán (VNĐ)',
    'Giá Trị Tồn Kho (VNĐ)',
    'Trạng Thái Định Mức',
  ]);

  // Data rows
  materials.forEach((m, idx) => {
    let statusLabel = 'Đạt định mức an toàn';
    if (m.stockStatus === 'OUT_OF_STOCK') statusLabel = 'HẾT HÀNG (0)';
    else if (m.stockStatus === 'LOW_STOCK') statusLabel = 'Cảnh báo: Dưới mức tối thiểu';
    else if (m.stockStatus === 'OVER_STOCK') statusLabel = 'Cảnh báo: Vượt mức tối đa';

    aoa.push([
      idx + 1,
      m.code,
      m.name,
      m.specification,
      m.category,
      m.unit,
      m.location,
      m.initialStock,
      m.totalImported,
      m.totalExported,
      m.currentStock,
      m.minStock,
      m.maxStock,
      m.unitPrice,
      m.totalValue,
      statusLabel,
    ]);
  });

  // Summary row
  const totalItems = materials.length;
  const totalStockQty = materials.reduce((acc, m) => acc + m.currentStock, 0);
  const totalStockValue = materials.reduce((acc, m) => acc + m.totalValue, 0);

  aoa.push([]);
  aoa.push([
    'TỔNG CỘNG',
    `${totalItems} mặt hàng`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalStockQty,
    '',
    '',
    '',
    totalStockValue,
    '',
  ]);

  aoa.push([]);
  aoa.push(['', '', '', '', '', '', '', '', '', `Đà Nẵng, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`]);
  aoa.push([]);
  aoa.push([
    'NGƯỜI LẬP BIỂU',
    '',
    '',
    'THỦ KHO',
    '',
    '',
    '',
    '',
    '',
    'TRƯỞNG ĐỘI ĐIỆN NƯỚC',
  ]);
  aoa.push([
    '(Ký, ghi rõ họ tên)',
    '',
    '',
    '(Ký, ghi rõ họ tên)',
    '',
    '',
    '',
    '',
    '',
    '(Ký, đóng dấu)',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!merges'] = [
    { s: { r: 3, c: 0 }, e: { r: 3, c: 15 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: 15 } },
  ];

  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 18 }, // Mã
    { wch: 38 }, // Tên
    { wch: 42 }, // Quy cách
    { wch: 28 }, // Nhóm
    { wch: 8 },  // ĐVT
    { wch: 18 }, // Vị trí
    { wch: 12 }, // Tồn đầu
    { wch: 14 }, // Nhập
    { wch: 14 }, // Xuất
    { wch: 14 }, // Tồn hiện tại
    { wch: 12 }, // Min
    { wch: 12 }, // Max
    { wch: 18 }, // Đơn giá
    { wch: 20 }, // Thành tiền
    { wch: 25 }, // Trạng thái
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Muc_Vat_Tu_AHT');
  XLSX.writeFile(wb, `Danh_Muc_Vat_Tu_AHT_Dien_Nuoc_${today.toISOString().split('T')[0].replace(/-/g, '')}.xlsx`);
}
