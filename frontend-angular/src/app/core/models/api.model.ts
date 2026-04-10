export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message?: string;
  [key: string]: unknown;
  data?: T;
}

export interface PagedUsersResponse {
  status: 'success' | 'error';
  users: Array<{
    id: number;
    full_name: string;
    email: string;
    role: string;
    is_active: number;
    created_at?: string;
  }>;
  total_items: number;
  page: number;
  per_page: number;
  summary: {
    total_users: number;
    active_users: number;
    staff_users: number;
    admin_users: number;
  };
  message?: string;
}
