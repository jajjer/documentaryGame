export function getCurrentWeekId(): { id: string; label: string } {
  const now = new Date();
  const day = now.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = (day + 6) % 7; // 0 if Monday
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diffToMonday);

  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');

  const id = `${year}-${month}-${date}`; // e.g. 2026-03-02
  const label = `Week of ${month}/${date}/${year}`;

  return { id, label };
}

export function normalizeTitle(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’"]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(the|a|an)\s+/, '');
}

