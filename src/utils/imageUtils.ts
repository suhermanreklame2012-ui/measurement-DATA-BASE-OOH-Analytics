/**
 * Utility functions for handling billboard construction photos and Google Drive image links.
 */
import { getAccessToken } from '../services/googleAuthService';
import { fetchDriveImageAsBase64 } from '../services/googleWorkspaceService';

// Authentic Outdoor Billboard / Highway OOH default photo
export const DEFAULT_OOH_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80';

/**
 * Converts Google Drive sharing links into direct embeddable image URLs.
 * Google Drive links usually look like:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * 
 * Google direct CDN host: https://lh3.googleusercontent.com/d/FILE_ID
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|uc\?export=view&id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/i;
  const match = url.trim().match(driveRegex);
  return (match && match[1]) ? match[1] : null;
}

export function formatImageUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Check for Google Drive file ID
  const fileId = extractDriveFileId(trimmed);
  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return trimmed;
}

/**
 * Checks if a given URL is a Google Drive link.
 */
export function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return /drive\.google\.com|lh3\.googleusercontent\.com\/d\//i.test(url);
}

/**
 * Returns a human-friendly source badge for a photo URL.
 */
export function getPhotoSourceLabel(url: string): { label: string; isDrive: boolean; isLocal: boolean } {
  if (!url) return { label: 'URL', isDrive: false, isLocal: false };
  if (url.startsWith('data:image')) {
    return { label: 'File Upload Lokal', isDrive: false, isLocal: true };
  }
  if (isGoogleDriveUrl(url)) {
    return { label: 'Google Drive (suherman.reklame2012@gmail.com)', isDrive: true, isLocal: false };
  }
  return { label: 'Direct Web URL', isDrive: false, isLocal: false };
}

/**
 * Returns a valid primary image URL for a given media spot.
 * Falls back to high-quality OOH placeholder if none specified.
 */
export function getSpotImageUrl(spot?: { imageUrl?: string; imageUrls?: string[]; photoUrl?: string } | null): string {
  if (!spot) return DEFAULT_OOH_FALLBACK_IMAGE;
  if (spot.imageUrl && spot.imageUrl.trim().length > 0) return formatImageUrl(spot.imageUrl);
  if (spot.imageUrls && spot.imageUrls.length > 0 && spot.imageUrls[0]?.trim().length > 0) return formatImageUrl(spot.imageUrls[0]);
  if (spot.photoUrl && spot.photoUrl.trim().length > 0) return formatImageUrl(spot.photoUrl);
  return DEFAULT_OOH_FALLBACK_IMAGE;
}

/**
 * Returns all available image URLs for a media spot.
 */
export function getAllSpotImages(spot?: { imageUrl?: string; imageUrls?: string[]; photoUrl?: string } | null): string[] {
  if (!spot) return [DEFAULT_OOH_FALLBACK_IMAGE];
  const list: string[] = [];
  if (spot.imageUrl && spot.imageUrl.trim().length > 0) list.push(formatImageUrl(spot.imageUrl));
  if (spot.imageUrls && Array.isArray(spot.imageUrls)) {
    spot.imageUrls.forEach(u => {
      if (u && u.trim().length > 0) {
        const formatted = formatImageUrl(u);
        if (!list.includes(formatted)) list.push(formatted);
      }
    });
  }
  if (spot.photoUrl && spot.photoUrl.trim().length > 0) {
    const formatted = formatImageUrl(spot.photoUrl);
    if (!list.includes(formatted)) list.push(formatted);
  }
  if (list.length === 0) {
    list.push(DEFAULT_OOH_FALLBACK_IMAGE);
  }
  return list;
}

/**
 * Loads an image from a URL and converts it to a base64 JPEG data URL.
 * Handles authenticated Google Drive API downloads, CORS safety, and resolves with null on failure/timeout.
 */
export async function loadImageAsBase64(url: string, timeoutMs = 4000): Promise<string | null> {
  if (!url) return null;
  const formattedUrl = formatImageUrl(url);
  if (formattedUrl.startsWith('data:image')) {
    return formattedUrl;
  }

  // If this is a Google Drive URL, attempt authenticated API download first
  const driveFileId = extractDriveFileId(url);
  if (driveFileId) {
    try {
      const token = await getAccessToken();
      if (token) {
        const driveBase64 = await fetchDriveImageAsBase64(token, driveFileId);
        if (driveBase64) {
          return driveBase64;
        }
      }
    } catch (e) {
      console.warn('Google Drive direct base64 fetch attempt notice:', e);
    }
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 800;
        canvas.height = img.naturalHeight || img.height || 600;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } else {
          resolve(null);
        }
      } catch (e) {
        console.warn('Canvas export failed (likely CORS restriction):', e);
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = formattedUrl;
  });
}

/**
 * Generates an elegant fallback vector canvas data URL representing a billboard spot
 * when network or CORS prevents loading the external photo.
 */
export function createSpotFallbackCanvas(spot: {
  name: string;
  roadName: string;
  city: string;
  size: string;
  category?: string;
  layout?: string;
  dailyImpressions?: number;
}): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background sky & gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 800, 500);
  bgGrad.addColorStop(0, '#0f172a'); // slate-900
  bgGrad.addColorStop(0.7, '#1e293b'); // slate-800
  bgGrad.addColorStop(1, '#090d16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 800, 500);

  // Road & pavement
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 440, 800, 60);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(100, 468, 120, 8);
  ctx.fillRect(340, 468, 120, 8);
  ctx.fillRect(580, 468, 120, 8);

  // Billboard Poles
  ctx.fillStyle = '#475569';
  ctx.fillRect(260, 310, 24, 130);
  ctx.fillRect(516, 310, 24, 130);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(264, 310, 8, 130);
  ctx.fillRect(520, 310, 8, 130);

  // Outer Billboard Frame
  ctx.fillStyle = '#0284c7'; // cyan/sky border
  ctx.fillRect(76, 46, 648, 268);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(80, 50, 640, 260);

  // Header Bar inside billboard
  ctx.fillStyle = spot.category === 'DOOH_DIGITAL' ? '#7e22ce' : '#059669';
  ctx.fillRect(80, 50, 640, 44);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  const catText = spot.category === 'DOOH_DIGITAL' ? 'DOOH DIGITAL VIDEOTRON • HIGH REFRESH RATE' : 'OOH STATIC BILLBOARD • FRONTLITE';
  ctx.fillText(catText, 104, 78);

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`Dimensi: ${spot.size} (${spot.layout || 'Horizontal'})`, 530, 78);

  // Billboard Body Content
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  const nameTruncated = spot.name.length > 34 ? spot.name.slice(0, 32) + '...' : spot.name;
  ctx.fillText(nameTruncated, 104, 135);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Koridor: ${spot.roadName}, ${spot.city}`, 104, 172);

  // OTS Badge & specs inside board
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(104, 205, 280, 48);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(104, 205, 280, 48);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 18px monospace';
  const otsText = spot.dailyImpressions ? `${spot.dailyImpressions.toLocaleString('id-ID')} OTS / hari` : 'High Traffic Corridor';
  ctx.fillText(otsText, 118, 235);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('SUHERMAN REKLAME • DOKUMENTASI VISUAL LAPANGAN', 104, 285);

  return canvas.toDataURL('image/jpeg', 0.9);
}
