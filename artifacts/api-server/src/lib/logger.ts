// Lightweight console-based logger — compatible with both Node.js and Cloudflare Workers.
export const logger = {
  info: (obj: unknown, msg?: string) => console.info(msg ?? "", obj),
  error: (obj: unknown, msg?: string) => console.error(msg ?? "", obj),
  warn: (obj: unknown, msg?: string) => console.warn(msg ?? "", obj),
  debug: (obj: unknown, msg?: string) => console.debug(msg ?? "", obj),
};
