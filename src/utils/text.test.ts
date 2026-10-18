import {
  fullName,
  initials,
  maskEmail,
  matchesSearch,
  normalizeForSearch,
  shortName,
} from './text';

describe('initials', () => {
  it('toma la inicial del nombre y del apellido (HU-13)', () => {
    expect(initials('María Fernanda', 'López')).toBe('ML');
  });
  it('sin apellido usa la segunda palabra del nombre', () => {
    expect(initials('Ana Gómez')).toBe('AG');
    expect(initials('Luis', '')).toBe('L');
  });
});

describe('búsqueda sin tildes ni mayúsculas (HU-14)', () => {
  it('normaliza', () => {
    expect(normalizeForSearch('  María CASTAÑO ')).toBe('maria castano');
  });
  it('"ospi" encuentra "Ospina"', () => {
    expect(matchesSearch('ospi', 'Daniel', 'Ospina')).toBe(true);
    expect(matchesSearch('OSPÍ', 'Daniel', 'Ospina')).toBe(true);
    expect(matchesSearch('ospi', 'Laura', 'Castaño')).toBe(false);
  });
  it('busca por nombre completo y con consulta vacía devuelve todo', () => {
    expect(matchesSearch('maria lopez', 'María Fernanda', 'López')).toBe(false);
    expect(matchesSearch('fernanda lop', 'María Fernanda', 'López')).toBe(true);
    expect(matchesSearch('', 'Ana', 'Gómez')).toBe(true);
  });
});

describe('nombres', () => {
  it('shortName y fullName', () => {
    expect(shortName('María Fernanda', 'López')).toBe('María López');
    expect(fullName('Luis', '')).toBe('Luis');
  });
  it('maskEmail', () => {
    expect(maskEmail('maria.lopez@correo.com')).toBe('ma•••@correo.com');
  });
});
