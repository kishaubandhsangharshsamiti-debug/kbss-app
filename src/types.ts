export type UserRole = 'ADMIN' | 'PRESIDENT' | 'OFFICE_BEARER' | 'MEMBER' | 'admin' | 'user';

export type AccountStatus = 'PENDING' | 'APPROVED' | 'ACTIVE' | 'REJECTED' | 'DISABLED' | 'CORRECTION_REQUIRED';
export type MemberStatus = AccountStatus;
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED';

export interface UserAccount {
  id: string;
  uid?: string;
  email: string;
  mobile?: string;
  name?: string;
  role: UserRole;
  designation?: string;
  village?: string;
  status?: AccountStatus;
  code?: string;
  memberId?: string;
  photoUrl?: string;
  password?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
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
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  correctionMessage?: string;
  correctionFields?: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  approvedCode?: string;
}

export interface MemberRecord {
  id: string;
  code: string; // e.g. KBS-00001 or 0.001
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
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface Member {
  id: string;
  userId: string;
  userCode?: string; // Format: KBS-00001
  name: string;
  fatherName: string;
  mobile: string;
  email: string;
  village: string;
  address: string;
  designationId?: string;
  designationName?: string;
  designation?: string;
  educationId?: string;
  educationName?: string;
  education?: string;
  photoUrl: string;
  status: MemberStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface Designation {
  id: string;
  name: string;
  status: boolean;
  sortOrder: number;
}

export interface EducationOption {
  id: string;
  name: string;
  status: boolean;
  sortOrder: number;
}

export interface MeetingItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  agenda?: string;
  status: 'DRAFT' | 'PUBLISHED';
  published?: boolean;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  agenda: string;
  pdfUrl?: string;
  published: boolean;
  createdAt: string;
}

export interface UpdateItem {
  id: string;
  title: string;
  date: string;
  category: string;
  description: string;
  imageUrl?: string;
  status: 'DRAFT' | 'PUBLISHED';
  published?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  published: boolean;
  createdAt: string;
}

export interface AboutContent {
  content: string;
  objectives: string[];
  highlightTagline: string;
}

export interface ContactInfo {
  mobile: string;
  email: string;
  whatsapp: string;
  address: string;
}

export interface CommitteeSettings {
  committeeName: string;
  tagline?: string;
  logoUrl: string;
  signatureUrl?: string;
  presidentName?: string;
  presidentSignatureUrl?: string;
  adminName?: string;
  adminSignatureUrl?: string;
  updatedAt?: string;
  villages?: string[];
}

export interface IdCardRecord {
  id?: string;
  userCode: string;
  memberId: string;
  userId: string;
  name: string;
  designation: string;
  education: string;
  photoUrl: string;
  issuedAt: string;
}

export interface PublicVerificationData {
  userCode: string;
  name: string;
  designation: string;
  education: string;
  status: MemberStatus;
  photoUrl: string;
  issuedAt?: string;
}

export interface DashboardStats {
  totalMembers: number;
  approvedMembers: number;
  pendingMembers: number;
  rejectedMembers: number;
  disabledMembers: number;
  totalMeetings: number;
}

export interface PasswordResetRequest {
  id: string;
  userId?: string;
  memberId?: string;
  memberCode?: string;
  name: string;
  email: string;
  mobile: string;
  village?: string;
  newPassword: string;
  note?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

