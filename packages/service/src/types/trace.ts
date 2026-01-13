/**
 * Trace types for Playwright session recording
 * Shared between service (backend) and inspector (frontend)
 */

export interface TraceStep {
  /** Step index (0-based) */
  index: number;
  /** Action type (e.g., "goto", "click") */
  action: string;
  /** Action details (e.g., URL or selector) */
  details: string;
  /** Timestamp when the action completed */
  timestamp: number;
  /** Base64 encoded JPEG screenshot */
  screenshot: string;
  /** Page URL after the action */
  url: string;
}

export interface TraceData {
  /** When the trace started (Unix timestamp) */
  startTime: number;
  /** When the trace ended (Unix timestamp) */
  endTime: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Whether all actions completed successfully */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Array of captured steps */
  steps: TraceStep[];
}
