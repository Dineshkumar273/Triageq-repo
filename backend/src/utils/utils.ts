export function formatEstimate(time: any) {
  if (!time?.originalEstimateSeconds) return "—";

  const hours = time.originalEstimateSeconds / 3600;

  if (hours >= 24) return `${Math.round(hours / 24)}d`;
  if (hours >= 1) return `${Math.round(hours)}h`;

  return `${Math.round(hours * 60)}m`;
}