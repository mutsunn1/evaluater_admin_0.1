/**
 * Format a millisecond duration into a human-readable string.
 */
export function formatDuration(ms: null | number | undefined): string {
  if (ms === null || ms === undefined || ms < 0) {
    return '-';
  }

  if (ms < 1000) {
    return `${ms} ms`;
  }

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} 小时`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} 分`);
  }
  if (seconds > 0 && hours === 0) {
    // Show seconds only when under an hour to keep long durations compact
    parts.push(`${seconds} 秒`);
  }

  return parts.length > 0 ? parts.join(' ') : '0 秒';
}
