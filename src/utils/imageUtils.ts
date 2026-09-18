/**
 * Utility functions for handling billboard construction photos and Google Drive image links.
 */

/**
 * Converts Google Drive sharing links into direct embeddable image URLs.
 * Google Drive links usually look like:
 * - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * 
 * Google direct CDN host: https://lh3.googleusercontent.com/d/FILE_ID
 */
export function formatImageUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Check for Google Drive file ID
  const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=|uc\?export=view&id=)|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/i;
  const match = trimmed.match(driveRegex);
  if (match && match[1]) {
    const fileId = match[1];
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
    return { label: 'Google Drive Link', isDrive: true, isLocal: false };
  }
  return { label: 'Direct Web URL', isDrive: false, isLocal: false };
}
