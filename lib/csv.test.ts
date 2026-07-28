import { describe, it, expect } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });

  it('writes a header row from the first object\'s keys', () => {
    const csv = toCsv([{ id: 1, title: 'Buy milk' }]);
    expect(csv.split('\n')[0]).toBe('id,title');
  });

  it('serializes multiple rows in order', () => {
    const csv = toCsv([
      { id: 1, title: 'Buy milk' },
      { id: 2, title: 'Walk dog' }
    ]);
    expect(csv).toBe('id,title\n1,Buy milk\n2,Walk dog');
  });

  it('quotes fields containing a comma', () => {
    const csv = toCsv([{ title: 'Buy milk, eggs, and bread' }]);
    expect(csv).toBe('title\n"Buy milk, eggs, and bread"');
  });

  it('quotes fields containing a newline', () => {
    const csv = toCsv([{ note: 'line one\nline two' }]);
    expect(csv).toBe('note\n"line one\nline two"');
  });

  it('doubles up embedded quotes and wraps the field in quotes', () => {
    const csv = toCsv([{ title: 'She said "hello"' }]);
    expect(csv).toBe('title\n"She said ""hello"""');
  });

  it('renders null and undefined as empty cells, not the literal string', () => {
    const csv = toCsv([{ dueDate: null, ipAddress: undefined }]);
    expect(csv).toBe('dueDate,ipAddress\n,');
  });
});
