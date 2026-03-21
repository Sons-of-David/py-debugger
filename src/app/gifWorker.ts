import { GIFEncoder, quantize, applyPalette } from 'gifenc';

let encoder: ReturnType<typeof GIFEncoder> | null = null;
let sharedPalette: number[][] | null = null;

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init': {
      encoder = GIFEncoder();
      sharedPalette = null;
      break;
    }

    case 'frame': {
      if (!encoder) break;
      const rgba = new Uint8ClampedArray(msg.data);

      if (!sharedPalette) {
        sharedPalette = quantize(rgba, 256);
      }

      const indexed = applyPalette(rgba, sharedPalette);
      encoder.writeFrame(indexed, msg.width, msg.height, {
        palette: sharedPalette,
        delay: 100,
        repeat: 0,
      });
      break;
    }

    case 'finish': {
      if (!encoder) break;
      encoder.finish();
      const bytes = encoder.bytes();
      const buffer = bytes.buffer as ArrayBuffer;
      (self as unknown as Worker).postMessage({ type: 'done', bytes: buffer }, [buffer]);
      encoder = null;
      sharedPalette = null;
      break;
    }
  }
};
