export interface User {
  id: number;
  full_name: string;
  email: string;
  profile_image?: string | null;
  role: 'administrator' | 'staff' | string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}
