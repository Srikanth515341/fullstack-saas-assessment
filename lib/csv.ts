// Minimal CSV serializer — no dependency needed for this. Handles the
// escaping rules that actually matter: quote any field containing a comma,
// quote, or newline, and double up embedded quotes.
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]);

  function escapeCell(value: unknown): string {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(','))
  ];

  return lines.join('\n');
}
