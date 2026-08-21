/**
 * Type definitions for Smart Inventory Management System
 * Hệ Thống Quản Lý Vật Tư Xuất - Nhập - Tồn Thông Minh
 */

export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  stt: number;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  roleName: 'Quản lý' | 'Nhân viên';
  note: string;
  avatarColor?: string;
  password?: string;
  defaultPassword?: string;
}

export interface Material {
  id: string;
  code: string; // Strictly starts with DN_ (e.g. DN_CC_00ACB_01)
  name: string;
  category: string;
  unit: string; // Cái, Cuộn, Mét, Bộ, Cây, Thùng, Kg, v.v.
  specification: string;
  location: string; // Vị trí kho (e.g. Kệ A1-02, Kho Tổng, Kho Cụm 1)
  initialStock: number; // Tồn đầu kỳ
  minStock: number; // Định mức tồn tối thiểu (ngưỡng an toàn)
  maxStock: number; // Định mức tồn tối đa
  unitPrice: number; // Đơn giá tiêu chuẩn (VNĐ)
  allocatedStaffEmails?: string[]; // Phân bổ quyền theo dõi/quản lý cho nhân viên cụ thể
  notes?: string;
  image?: string;
  updatedAt?: string;
}

export type TransactionType = 'IMPORT' | 'EXPORT' | 'TRANSFER' | 'ADJUSTMENT';

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT';

export interface TransactionItem {
  materialCode: string;
  materialName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currentStockAtCreation: number;
  proposalNumber?: string; // Số tờ trình cụ thể (e.g. 17-DNCT/PKT, 26-DNCT/PKT, 21-DNCT/PKT...)
  notes?: string;
}

export interface ProposalItem {
  materialCode: string;
  materialName: string;
  unit: string;
  requestedQuantity: number;
  unitPrice?: number;
  notes?: string;
}

export interface PurchaseProposal {
  id: string;
  proposalNumber: string; // e.g. "17-DNCT/PKT", "26-DNCT/PKT", "31-DNCT/PKT", "08-DNCT/PKT"
  title: string; // Tiêu đề / Nội dung tờ trình
  date: string; // YYYY-MM-DD
  creatorName: string;
  creatorEmail: string;
  department: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'COMPLETED' | 'PARTIALLY_IMPORTED';
  attachmentUrl?: string; // Data URL or Image/PDF link
  attachmentName?: string;
  attachmentType?: 'image' | 'pdf' | 'document';
  items: ProposalItem[];
  notes?: string;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  code: string; // Mã chứng từ: PN-2026-..., PX-2026-..., DN-2026-...
  type: TransactionType;
  title: string;
  proposalNumber?: string; // Số tờ trình phê duyệt nhập/xuất (e.g. 17-DNCT/PKT, 26-DNCT/PKT, 21-DNCT/PKT)
  proposalAttachmentUrl?: string; // Ảnh/File tờ trình đính kèm
  proposalAttachmentName?: string;
  proposalAttachmentType?: 'image' | 'pdf' | 'document';
  attachmentUrl?: string; // Tương thích đính kèm
  attachmentName?: string;
  attachmentType?: 'image' | 'pdf' | 'document';
  date: string; // YYYY-MM-DD
  creatorEmail: string;
  creatorName: string;
  creatorRole: UserRole;
  partner: string; // Nhà cung cấp (nếu Nhập) hoặc Đơn vị nhận/Công trình (nếu Xuất)
  warehouse: string; // Kho thực hiện
  status: TransactionStatus;
  items: TransactionItem[];
  totalQuantity: number;
  totalAmount: number;
  reason: string;
  approverEmail?: string;
  approverName?: string;
  approvalDate?: string;
  approvalNote?: string;
  createdAt: string;
}

export interface CalculatedMaterialStock extends Material {
  totalImported: number; // Tổng đã nhập (từ phiếu APPROVED)
  totalExported: number; // Tổng đã xuất (từ phiếu APPROVED)
  currentStock: number; // Tồn thực tế = initialStock + totalImported - totalExported
  pendingImport: number; // Chờ nhập (phiếu PENDING)
  pendingExport: number; // Chờ xuất (phiếu PENDING)
  availableStock: number; // Khả dụng = currentStock - pendingExport
  totalValue: number; // Giá trị tồn = currentStock * unitPrice
  stockStatus: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'OVER_STOCK' | 'OPTIMAL';
}

export interface StockCardEntry {
  id: string;
  date: string;
  documentCode: string;
  documentType: TransactionType;
  documentTitle: string;
  partner: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  unitPrice: number;
  amount: number;
  operator: string;
  notes?: string;
}

export interface StockSummaryReportItem {
  materialCode: string;
  materialName: string;
  unit: string;
  category: string;
  openingStock: number; // Tồn đầu
  openingValue: number;
  periodImportQty: number; // Nhập trong kỳ
  periodImportValue: number;
  periodExportQty: number; // Xuất trong kỳ
  periodExportValue: number;
  closingStock: number; // Tồn cuối kỳ
  closingValue: number;
  unitPrice: number;
}

export interface NaturalSearchFilters {
  searchKeyword?: string;
  category?: string;
  stockStatus?: 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVER_STOCK' | 'OPTIMAL';
  transactionStatus?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
  materialCodePrefix?: string;
  minPrice?: number;
  maxPrice?: number;
}
