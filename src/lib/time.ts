export function isTimeActive(availableFrom?: string | null, availableUntil?: string | null): boolean {
  if (!availableFrom && !availableUntil) return true;

  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();

  const parse = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };

  if (availableFrom && availableUntil) {
    const from = parse(availableFrom);
    const until = parse(availableUntil);
    if (from <= until) return minutes >= from && minutes <= until;
    return minutes >= from || minutes <= until;
  }

  if (availableFrom) return minutes >= parse(availableFrom);
  if (availableUntil) return minutes <= parse(availableUntil);

  return true;
}
