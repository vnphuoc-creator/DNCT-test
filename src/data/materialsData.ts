import { Material } from '../types';
import { materialsGroup1 } from './materialsGroup1';
import { materialsGroup2 } from './materialsGroup2';
import { RAW_MATERIALS_DATABASE_600 } from './materialsCatalog600';

export const ALL_MATERIAL_CATEGORIES: string[] = [
  'Vật tư Điện & Phụ kiện tiêu hao',
  'Thiết bị Điện & Trạm trung thế',
  'Hệ thống Chiếu sáng & Đèn công trình',
  'Vật tư Đường ống & Phụ kiện cấp thoát nước',
  'Thiết bị vệ sinh & Xử lý nước',
];

/**
 * Danh mục vật tư chính thức đầy đủ hơn 600 vật tư của Đội Điện Nước (ĐN) - AHT
 * Toàn bộ các mã vật tư đều có tiền tố chuẩn DN_
 */
const mergedMap = new Map<string, Material>();
[...materialsGroup1, ...materialsGroup2, ...RAW_MATERIALS_DATABASE_600].forEach((m) => {
  if (!mergedMap.has(m.code)) {
    mergedMap.set(m.code, m);
  }
});

export const RAW_MATERIALS_DATABASE: Material[] = Array.from(mergedMap.values());

