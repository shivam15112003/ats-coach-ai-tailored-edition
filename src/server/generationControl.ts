export class GenerationTimeoutError extends Error {
  status = 504;
  constructor() { super("Resume generation took too long. Your inputs are preserved; please retry."); this.name = "GenerationTimeoutError"; }
}

/** Bound even a transport that fails to settle, and forward cancellation to it. */
export async function boundedGeneration<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number, parent?: AbortSignal): Promise<T> {
  if (timeoutMs <= 0) throw new GenerationTimeoutError();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    const cancelled = new Promise<never>((_, reject) => {
      onAbort = () => { controller.abort(parent?.reason); reject(parent?.reason || new Error("Generation cancelled.")); };
      if (parent?.aborted) onAbort();
      else parent?.addEventListener("abort", onAbort, { once: true });
      timer = setTimeout(() => { const error = new GenerationTimeoutError(); controller.abort(error); reject(error); }, timeoutMs);
    });
    if (parent?.aborted) return await cancelled;
    return await Promise.race([cancelled, work(controller.signal)]);
  } finally {
    clearTimeout(timer);
    if (onAbort) parent?.removeEventListener("abort", onAbort);
  }
}

export function unsupportedArchitected(original: string, tailored: string): boolean {
  return /\barchitected\b/i.test(tailored) && !/\barchitected\b/i.test(original) && !/\barchitect\b/i.test(original);
}
