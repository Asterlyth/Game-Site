export function formatGrowTime(seconds: number): string {
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = minutes / 60;
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded} hr`;
}
