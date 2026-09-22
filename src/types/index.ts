export type UserRole = 'ADMIN' | 'PRESIDENT' | 'OFFICE_BEARER' | 'MEMBER';

export type AccountStatus = 'PENDING' | 'CORRECTION_REQUIRED' | 'APPROVED' | 'REJECTED' | 'DISABLED' | 'ACTIVE';

export type RequestStatus = 'PENDING' | 'CORRECTION_REQUIRED' | 'APPROVED' | 'REJECTED';

export interface UserAccount {
  id: string; // Auth UID or doc ID
  email: string;
  mobile: string;
  name: string;
  role: UserRole;
  status: AccountStatus;
  code?: string;
  memberId?: string;
  photoUrl?: string;
  password?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationRequest {
  id: string;
  userId?: string;
  name: string;
  fatherName: string;
  email: string;
  mobile: string;
  address: string;
  village: string;
  designation: string;
  education: string;
  photoUrl: string;
  password?: string;
  status: RequestStatus;
  correctionFields?: string[];
  correctionMessage?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
}

export interface MemberRecord {
  id: string;
  userId: string;
  code: string;
  role: UserRole;
  name: string;
  fatherName: string;
  email: string;
  mobile: string;
  address: string;
  village: string;
  designation: string;
  education: string;
  photoUrl: string;
  status: 'APPROVED' | 'DISABLED' | 'ACTIVE';
  createdAt: string;
  updatedAt: string;
  approvedAt: string;
  approvedBy?: string;
}

export interface CommitteeSettings {
  committeeName: string;
  logoUrl: string;
  presidentName: string;
  presidentSignatureUrl: string;
  adminName: string;
  adminSignatureUrl: string;
  updatedAt: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  status: 'PUBLISHED' | 'DRAFT';
  published?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateItem {
  id: string;
  title: string;
  description: string;
  date: string;
  category?: string;
  imageUrl?: string;
  status: 'PUBLISHED' | 'DRAFT';
  published?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CodeCounters {
  nextMemberNum: number;
  nextOfficerNum: number;
  nextAdminNum: number;
}
