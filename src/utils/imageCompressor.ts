/**
 * Client-side Image Compression Utility
 * Prevents Firestore 1MB document size limit errors (1,048,576 bytes)
 * by compressing uploaded logos, signatures, and applicant photos to lightweight data URLs (< 60 KB).
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default 0.82)
  preserveTransparency?: boolean;
}

export async function compressImage(
  fileOrDataUrl: File | string,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 450,
    maxHeight = 450,
    quality = 0.82,
    preserveTransparency = true
  } = options;

  return new Promise((resolve, reject) => {
    // If empty string, return empty
    if (typeof fileOrDataUrl === 'string' && !fileOrDataUrl.trim()) {
      resolve('');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions preserving aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      // Ensure minimum non-zero dimensions
      width = Math.max(width, 1);
      height = Math.max(height, 1);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }

      // Check if original was PNG or if transparency should be preserved
      const isPng =
        (typeof fileOrDataUrl !== 'string' && fileOrDataUrl.type === 'image/png') ||
        (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:image/png'));

      if (preserveTransparency && isPng) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // Canvas PNG data URL is compressed due to smaller dimensions
        const pngUrl = canvas.toDataURL('image/png');
        // If the resulting PNG is still larger than 250KB, convert to high-quality JPEG with white background
        if (pngUrl.length > 250 * 1024) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(pngUrl);
        }
      } else {
        // High quality JPEG compression
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      }
    };

    img.onerror = (err) => {
      console.warn('Image load error during compression:', err);
      // Fallback: if string, resolve as-is
      if (typeof fileOrDataUrl === 'string') {
        resolve(fileOrDataUrl);
      } else {
        reject(new Error('Failed to load image for compression'));
      }
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
