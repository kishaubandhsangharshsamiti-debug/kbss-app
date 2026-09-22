export const getVerificationUrl = (userCode: string): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/verify/${encodeURIComponent(userCode)}`;
};
