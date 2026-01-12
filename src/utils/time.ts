/**
 * Format seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Parse duration string (e.g., "3:45") to seconds
 */
export function parseDuration(duration: string): number {
  const [mins, secs] = duration.split(":").map(Number);
  return mins * 60 + secs;
}





