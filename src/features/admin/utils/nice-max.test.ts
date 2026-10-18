import { niceMax } from './nice-max';

describe('niceMax', () => {
  it.each([
    [0, 4],
    [3, 4],
    [7, 10],
    [13, 20],
    [48, 50],
    [51, 100],
    [230, 500],
  ])('%i → %i', (input, expected) => {
    expect(niceMax(input)).toBe(expected);
  });
});
