import { parseNames, splitGuestName, useGuestListStore } from './guest-list-store';

const store = () => useGuestListStore.getState();

describe('guest-list-store (HU-01, HU-02)', () => {
  beforeEach(() => store().reset());

  it('agrega un nombre', () => {
    expect(store().add('Ana Gómez')).toEqual({ ok: true, added: 1 });
    expect(store().entries.map((e) => e.name)).toEqual(['Ana Gómez']);
  });

  it('agrega varios separados por coma en orden', () => {
    store().add('Ana, Luis, Camila');
    expect(store().entries.map((e) => e.name)).toEqual(['Ana', 'Luis', 'Camila']);
  });

  it('ignora entradas vacías', () => {
    expect(store().add('  ,  , ')).toEqual({ ok: false, reason: 'empty' });
    expect(store().entries).toHaveLength(0);
  });

  it('rechaza nombres de más de 60 caracteres sin agregar ninguno', () => {
    expect(store().add(`Ana, ${'x'.repeat(61)}`)).toEqual({ ok: false, reason: 'too_long' });
    expect(store().entries).toHaveLength(0);
  });

  it('permite nombres repetidos (se identifican por id)', () => {
    store().add('Ana, Ana');
    const [a, b] = store().entries;
    expect(a?.id).not.toBe(b?.id);
    store().remove(a?.id ?? '');
    expect(store().entries.map((e) => e.name)).toEqual(['Ana']);
  });

  it('no supera 200 nombres', () => {
    store().add(Array.from({ length: 200 }, (_, i) => `P${i}`).join(','));
    expect(store().add('Uno más')).toEqual({ ok: false, reason: 'limit' });
  });

  it('mezcla sin perder nombres y vacía la lista', () => {
    store().add('A, B, C, D, E');
    store().shuffle();
    expect(
      store()
        .entries.map((e) => e.name)
        .sort(),
    ).toEqual(['A', 'B', 'C', 'D', 'E']);
    store().clear();
    expect(store().entries).toHaveLength(0);
  });

  it('numera los ganadores de la sesión', () => {
    store().recordWinner('Ana');
    store().recordWinner('Luis');
    expect(store().winners).toEqual([
      { round: 2, name: 'Luis' },
      { round: 1, name: 'Ana' },
    ]);
  });
});

describe('parseNames', () => {
  it('normaliza espacios internos', () => {
    expect(parseNames('  Ana   Gómez ,Luis')).toEqual(['Ana Gómez', 'Luis']);
  });
});

describe('splitGuestName (HU-05)', () => {
  it.each([
    ['Ana Gómez', { firstName: 'Ana', lastName: 'Gómez' }],
    ['María Fernanda López', { firstName: 'María', lastName: 'Fernanda López' }],
    ['Luis', { firstName: 'Luis', lastName: '' }],
  ])('%s', (name, expected) => {
    expect(splitGuestName(name)).toEqual(expected);
  });
});
