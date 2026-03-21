declare module 'gifenc' {
  export function GIFEncoder(opts?: { initialCapacity?: number; auto?: boolean }): {
    writeHeader(): void;
    writeFrame(
      indexedPixels: Uint8Array,
      width: number,
      height: number,
      opts?: {
        palette?: number[][];
        delay?: number;
        repeat?: number;
        transparent?: boolean;
        transparentIndex?: number;
        dispose?: number;
      }
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
  };

  export function quantize(
    rgba: Uint8ClampedArray | Uint8Array,
    maxColors: number,
    opts?: { format?: string; oneBitAlpha?: boolean }
  ): number[][];

  export function applyPalette(
    rgba: Uint8ClampedArray | Uint8Array,
    palette: number[][]
  ): Uint8Array;
}
