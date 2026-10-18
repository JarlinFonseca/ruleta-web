import { safeNext } from './safe-next';

describe('safeNext', () => {
  it.each([
    ['/sorteos/5', '/sorteos/5'],
    [null, '/sorteos'],
    ['https://malo.com', '/sorteos'],
    ['//malo.com', '/sorteos'],
    ['/\\malo.com', '/sorteos'],
  ])('%s → %s', (input, expected) => {
    expect(safeNext(input)).toBe(expected);
  });
});
