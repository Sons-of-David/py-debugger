import { useState, useCallback } from 'react';
import { quantize } from 'gifenc';
import type { CaptureRegion } from '../visual-panel/components/CaptureRegionLayer';
import { renderFrameToCanvas } from './canvasRenderer';
import { getStateAt, getMaxTime } from '../timeline/timelineState';

interface UseGifExportOptions {
  darkMode: boolean;
}

interface UseGifExportResult {
  handleCreateGif: (region: CaptureRegion | null) => Promise<void>;
  isCreatingGif: boolean;
}

export function useGifExport({ darkMode }: UseGifExportOptions): UseGifExportResult {
  const [isCreatingGif, setIsCreatingGif] = useState(false);

  const handleCreateGif = useCallback(async (region: CaptureRegion | null) => {
    if (isCreatingGif) return;
    const maxStep = getMaxTime();
    if (maxStep < 1) return;

    setIsCreatingGif(true);
    try {
      const worker = new Worker(new URL('./gifWorker.ts', import.meta.url), { type: 'module' });

      const gifDone = new Promise<ArrayBuffer>((resolve, reject) => {
        worker.onmessage = (e) => {
          if (e.data.type === 'done') { resolve(e.data.bytes); worker.terminate(); }
        };
        worker.onerror = (err) => { reject(err); worker.terminate(); };
      });

      const gifRegion = region ?? { col: 0, row: 0, widthCells: 50, heightCells: 50 };
      const offscreen = document.createElement('canvas');
      offscreen.width = gifRegion.widthCells * 40;
      offscreen.height = gifRegion.heightCells * 40;
      const ctx = offscreen.getContext('2d')!;

      // Build palette from a spread of frames so colors that only appear mid-animation
      // (e.g. A* explored/frontier blue/green) are included.
      // TODO: could also pre-scan all element colors across all steps directly from the
      // data model instead of rendering sample frames, which would be even cheaper.
      const PALETTE_SAMPLES = 5;
      const sampleIndices = Array.from({ length: PALETTE_SAMPLES }, (_, k) =>
        Math.round(k * maxStep / (PALETTE_SAMPLES - 1))
      );
      const palettePixels: Uint8ClampedArray[] = [];
      for (const i of sampleIndices) {
        const els = getStateAt(i);
        if (!els) continue;
        renderFrameToCanvas(els, ctx, gifRegion, darkMode);
        palettePixels.push(new Uint8ClampedArray(ctx.getImageData(0, 0, offscreen.width, offscreen.height).data));
      }
      const combined = new Uint8ClampedArray(palettePixels.reduce((n, a) => n + a.length, 0));
      let off = 0;
      for (const px of palettePixels) { combined.set(px, off); off += px.length; }
      const palette = quantize(combined, 256);

      worker.postMessage({ type: 'init', palette });

      let hasFrames = false;
      for (let i = 0; i <= maxStep; i++) {
        const elements = getStateAt(i);
        if (!elements) continue;
        renderFrameToCanvas(elements, ctx, gifRegion, darkMode);
        hasFrames = true;
        const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
        worker.postMessage(
          { type: 'frame', data: imageData.data.buffer, width: offscreen.width, height: offscreen.height },
          [imageData.data.buffer],
        );
      }

      if (!hasFrames) { worker.terminate(); return; }

      worker.postMessage({ type: 'finish' });
      const gifBytes = await gifDone;

      const blob = new Blob([gifBytes], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `trace-${timestamp}.gif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('GIF export failed:', err);
    } finally {
      setIsCreatingGif(false);
    }
  }, [isCreatingGif, darkMode]);

  return { handleCreateGif, isCreatingGif };
}
