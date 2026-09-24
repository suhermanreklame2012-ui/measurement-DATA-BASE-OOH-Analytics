import html2canvas from 'html2canvas-pro';

export interface ChartExportOptions {
  scale?: number;
  backgroundColor?: string;
  regionName?: string;
}

/**
 * Exports a DOM element (chart or dashboard section) as a crisp, high-resolution PNG image
 * suitable for PowerPoint, Google Slides, Keynote, and client presentation proposals.
 */
export async function exportChartElementAsPng(
  elementId: string,
  baseFilename: string,
  options: ChartExportOptions = {}
): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemen grafik dengan ID "${elementId}" tidak ditemukan.`);
  }

  // Use scale: 2 for sharp 2x Retina presentation quality
  const scale = options.scale ?? 2;
  const backgroundColor = options.backgroundColor ?? '#ffffff';

  // Temporarily ensure element is visible and properly scrolled
  const originalScrollTop = window.scrollY;

  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // Add presentation header/badge if region is specified
          if (options.regionName) {
            const badge = clonedDoc.createElement('div');
            badge.style.display = 'flex';
            badge.style.justifyContent = 'space-between';
            badge.style.alignItems = 'center';
            badge.style.padding = '8px 16px';
            badge.style.marginBottom = '12px';
            badge.style.backgroundColor = '#0f172a';
            badge.style.color = '#ffffff';
            badge.style.borderRadius = '10px';
            badge.style.fontSize = '12px';
            badge.style.fontFamily = 'system-ui, -apple-system, sans-serif';
            badge.innerHTML = `
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:#10b981;"></span>
                <span style="font-weight:700;letter-spacing:-0.01em;">OOH & DOOH Jabar Analytics — Suherman Reklame</span>
              </div>
              <div style="color:#94a3b8;font-size:11px;">
                Wilayah: <strong style="color:#34d399;">${options.regionName}</strong> • ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            `;
            clonedElement.insertBefore(badge, clonedElement.firstChild);
          }
        }
      }
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    
    // Construct clean date stamp for filename
    const now = new Date();
    const dateStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const cleanFilename = `${baseFilename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '')}_${dateStamp}.png`;

    // Trigger download
    const link = document.createElement('a');
    link.download = cleanFilename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Restore scroll position
    window.scrollTo({ top: originalScrollTop });

    return cleanFilename;
  } catch (error) {
    console.error('Failed to export chart as PNG:', error);
    throw error;
  }
}
