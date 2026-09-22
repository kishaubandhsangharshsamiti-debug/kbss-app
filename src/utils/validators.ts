export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateMobile = (mobile: string): ValidationResult => {
  const cleanMobile = mobile.trim();
  if (!cleanMobile) {
    return { isValid: false, error: 'Mobile number is required' };
  }
  // Standard 10-digit Indian phone number
  const regex = /^[6-9]\d{9}$/;
  if (!regex.test(cleanMobile)) {
    return { isValid: false, error: 'Please enter a valid 10-digit Indian mobile number starting with 6-9' };
  }
  return { isValid: true };
};

export const validateEmail = (email: string): ValidationResult => {
  const cleanEmail = email.trim();
  if (!cleanEmail) {
    return { isValid: false, error: 'Email is required' };
  }
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(cleanEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }
  return { isValid: true };
};

export const validatePhotoFile = (file: File | null): ValidationResult => {
  if (!file) {
    return { isValid: false, error: 'Photo is required' };
  }
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return { isValid: false, error: 'Only JPG, PNG, or WEBP images are allowed' };
  }
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image size must be less than 2MB' };
  }
  return { isValid: true };
};
