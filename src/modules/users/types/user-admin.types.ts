export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: "active" | "suspended" | "all";
  isVerified?: boolean | string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface UserAdminResponse {
  _id: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  companyName?: string;
  businessProfile?: string;
  role: string;
  status: string;
  statusReason?: string;
  isVerified: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserAdminStatsResponse {
  total: number;
  active: number;
  suspended: number;
  verified: number;
  unverified: number;
}
