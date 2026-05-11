module.exports = [
  { slug: 'categories', title: 'Categories', table: 'danh_muc', group: 'Catalog' },
  { slug: 'products', title: 'Products', table: 'san_pham', group: 'Catalog' },

  { slug: 'customers', title: 'Customers', table: 'khach_hang', group: 'Partners' },
  { slug: 'suppliers', title: 'Suppliers', table: 'nha_cung_cap', group: 'Partners' },

  { slug: 'orders', title: 'Orders', table: 'don_hang', group: 'Sales' },
  { slug: 'order-items', title: 'Order Items', table: 'ct_don_hang', group: 'Sales' },
  { slug: 'receipts', title: 'Receipts', table: 'phieu_thu', group: 'Sales' },

  { slug: 'inventory', title: 'Inventory On Hand', table: 'ton_kho', group: 'Inventory' },
  { slug: 'inventory-history', title: 'Inventory History', table: 'lich_su_kho', group: 'Inventory' },
  { slug: 'inbound', title: 'Inbound Slips', table: 'phieu_nhap', group: 'Inventory' },
  { slug: 'inbound-items', title: 'Inbound Items', table: 'ct_phieu_nhap', group: 'Inventory' },
  { slug: 'outbound', title: 'Outbound Slips', table: 'phieu_xuat', group: 'Inventory' },
  { slug: 'outbound-items', title: 'Outbound Items', table: 'ct_phieu_xuat', group: 'Inventory' },
  { slug: 'inventory-adjustments', title: 'Stock Adjustments', table: 'phieu_dieu_chinh_ton', group: 'Inventory' },
  { slug: 'stock-counts', title: 'Stock Count Sheets', table: 'bien_ban_kiem_ke', group: 'Inventory' },
  { slug: 'stock-count-items', title: 'Stock Count Items', table: 'ct_kiem_ke', group: 'Inventory' },

  { slug: 'debts', title: 'Debt Ledger', table: 'so_cong_no', group: 'Finance' },
  { slug: 'debt-events', title: 'Debt Events', table: 'phat_sinh_cong_no', group: 'Finance' },
  { slug: 'debt-payments', title: 'Debt Payments', table: 'phieu_thanh_toan_cong_no', group: 'Finance' },

  { slug: 'users', title: 'Users', table: 'nguoi_dung', group: 'System' }
];
