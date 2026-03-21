export interface Tool {
  _id: string;
  code: string;
  description: string;
  source: "Warehouse" | "Store" | "Local" | "Service";
  measurement: string;
  stockPrice: number;
  customerPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ToolPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
