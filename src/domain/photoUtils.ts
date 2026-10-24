export function downscaleDimensions(
  origWidth: number,
  origHeight: number,
  maxDim = 800
): { width: number; height: number } {
  if (origWidth <= 0 || origHeight <= 0) {
    return { width: maxDim, height: maxDim };
  }

  if (origWidth <= maxDim && origHeight <= maxDim) {
    return { width: origWidth, height: origHeight };
  }

  if (origWidth >= origHeight) {
    const width = maxDim;
    const height = Math.round((origHeight * maxDim) / origWidth);
    return { width, height };
  } else {
    const height = maxDim;
    const width = Math.round((origWidth * maxDim) / origHeight);
    return { width, height };
  }
}

export interface TestPhotoRetakeState {
  photo: string | null;
  result: 'positive' | 'negative' | 'invalid' | null;
}

export function handleRetake<T extends TestPhotoRetakeState>(state: T): T {
  return {
    ...state,
    photo: null,
    result: null,
  };
}

export function isCaptureDisabled(state: { photo: string | null }): boolean {
  return state.photo !== null;
}

export function getVisibleView(params: {
  photo: string | null;
  camState: 'starting' | 'ready' | 'unavailable';
}): 'preview' | 'video' | 'unavailable_message' {
  if (params.photo !== null) return 'preview';
  if (params.camState === 'unavailable') return 'unavailable_message';
  return 'video';
}

export interface FilePickerProps {
  type: 'file';
  accept: string;
  capture?: 'environment';
}

export function getFilePickerProps(mode: 'camera' | 'gallery'): FilePickerProps {
  if (mode === 'camera') {
    return {
      type: 'file',
      accept: 'image/*',
      capture: 'environment',
    };
  }
  return {
    type: 'file',
    accept: 'image/*',
  };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Creates an 800px wide demo cassette image encoded as JPEG quality 0.7.
 */
export function createCassetteJpeg(type: 'positive' | 'negative' | 'invalid'): string {
  if (typeof document === 'undefined') {
    return `data:image/jpeg;base64,demo-${type}`;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 533;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#1c3a2b';
  ctx.fillRect(0, 0, 800, 533);

  // Cassette body (rounded card)
  ctx.fillStyle = '#f1f5f2';
  roundRect(ctx, 150, 185, 500, 160, 24);
  ctx.fill();

  // Sample well
  ctx.fillStyle = '#d9e2dc';
  roundRect(ctx, 190, 225, 90, 80, 16);
  ctx.fill();

  // Test result window
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#d0d7d2';
  ctx.lineWidth = 3;
  roundRect(ctx, 320, 220, 290, 90, 16);
  ctx.fill();
  ctx.stroke();

  // Lines
  ctx.fillStyle = '#d9534f';
  // Control line C: present in positive and negative, ABSENT in invalid
  if (type === 'positive' || type === 'negative') {
    ctx.fillRect(405, 220, 8, 90);
  }
  // Test line T: present in positive and invalid, absent in negative
  if (type === 'positive' || type === 'invalid') {
    ctx.fillRect(485, 220, 8, 90);
  }

  // C and T labels
  ctx.fillStyle = '#6b7770';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('C', 409, 208);
  ctx.fillText('T', 489, 208);

  return canvas.toDataURL('image/jpeg', 0.7);
}

/**
 * Downscales an image/video source to at most 800px on its longest side,
 * returning a JPEG data URL at quality 0.7.
 */
export function downscaleImageToJpeg(
  source: CanvasImageSource,
  origWidth: number,
  origHeight: number,
  maxDim = 800,
  quality = 0.7
): string {
  if (typeof document === 'undefined') return '';
  const { width, height } = downscaleDimensions(origWidth, origHeight, maxDim);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Reads a File (e.g. from <input type="file">), loads it, downscales to 800px,
 * and resolves with a JPEG data URL at quality 0.7.
 */
export function readFileAsDownscaledJpeg(file: File, maxDim = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        try {
          const dataUrl = downscaleImageToJpeg(img, img.naturalWidth || img.width, img.naturalHeight || img.height, maxDim, quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
