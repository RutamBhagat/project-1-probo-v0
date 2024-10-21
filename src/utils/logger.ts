// utils/logger.ts
export class Logger {
  constructor(private context: string) {}

  debug(message: string, meta?: any) {
    console.log(`[${this.context}] ${message}`, meta)
  }

  error(message: string, meta?: any) {
    console.error(`[${this.context}] ${message}`, meta)
  }
}
