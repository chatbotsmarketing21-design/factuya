// Configuración por país para FactuYa! (#30 — multi-país)
//
// Cada país define:
//   - name: nombre en español (lo que se muestra en el selector)
//   - taxIdLabel: etiqueta del campo de identificación tributaria (NIT, RFC, CNPJ, etc.)
//   - taxIdPlaceholder: ejemplo del formato
//   - taxName: nombre del impuesto local (IVA, VAT, GST, etc.)
//   - taxRate: porcentaje predeterminado del impuesto
//   - currency: moneda local (ISO 4217)
//   - currencySymbol: símbolo para mostrar ($, €, R$, etc.)
//
// Códigos de país en ISO 3166-1 alpha-2.

const COUNTRY_CONFIG = {
  // 🌎 Latinoamérica
  CO: { name: 'Colombia',        taxIdLabel: 'NIT',       taxIdPlaceholder: '900.123.456-7', taxName: 'IVA',  taxRate: 19, currency: 'COP', currencySymbol: '$' },
  MX: { name: 'México',          taxIdLabel: 'RFC',       taxIdPlaceholder: 'XAXX010101000', taxName: 'IVA',  taxRate: 16, currency: 'MXN', currencySymbol: '$' },
  AR: { name: 'Argentina',       taxIdLabel: 'CUIT',      taxIdPlaceholder: '20-12345678-9', taxName: 'IVA',  taxRate: 21, currency: 'ARS', currencySymbol: '$' },
  CL: { name: 'Chile',           taxIdLabel: 'RUT',       taxIdPlaceholder: '12.345.678-9',  taxName: 'IVA',  taxRate: 19, currency: 'CLP', currencySymbol: '$' },
  PE: { name: 'Perú',            taxIdLabel: 'RUC',       taxIdPlaceholder: '20123456789',   taxName: 'IGV',  taxRate: 18, currency: 'PEN', currencySymbol: 'S/' },
  VE: { name: 'Venezuela',       taxIdLabel: 'RIF',       taxIdPlaceholder: 'J-12345678-9',  taxName: 'IVA',  taxRate: 16, currency: 'USD', currencySymbol: '$' },
  EC: { name: 'Ecuador',         taxIdLabel: 'RUC',       taxIdPlaceholder: '1234567890001', taxName: 'IVA',  taxRate: 15, currency: 'USD', currencySymbol: '$' },
  BO: { name: 'Bolivia',         taxIdLabel: 'NIT',       taxIdPlaceholder: '1234567890',    taxName: 'IVA',  taxRate: 13, currency: 'BOB', currencySymbol: 'Bs' },
  PY: { name: 'Paraguay',        taxIdLabel: 'RUC',       taxIdPlaceholder: '80012345-6',    taxName: 'IVA',  taxRate: 10, currency: 'PYG', currencySymbol: '₲' },
  UY: { name: 'Uruguay',         taxIdLabel: 'RUT',       taxIdPlaceholder: '210123456789',  taxName: 'IVA',  taxRate: 22, currency: 'UYU', currencySymbol: '$' },
  CR: { name: 'Costa Rica',      taxIdLabel: 'Cédula',    taxIdPlaceholder: '3-101-123456',  taxName: 'IVA',  taxRate: 13, currency: 'CRC', currencySymbol: '₡' },
  PA: { name: 'Panamá',          taxIdLabel: 'RUC',       taxIdPlaceholder: '8-NT-1-123456', taxName: 'ITBMS',taxRate: 7,  currency: 'USD', currencySymbol: '$' },
  GT: { name: 'Guatemala',       taxIdLabel: 'NIT',       taxIdPlaceholder: '12345678-9',    taxName: 'IVA',  taxRate: 12, currency: 'GTQ', currencySymbol: 'Q' },
  HN: { name: 'Honduras',        taxIdLabel: 'RTN',       taxIdPlaceholder: '08011985123456',taxName: 'ISV',  taxRate: 15, currency: 'HNL', currencySymbol: 'L' },
  SV: { name: 'El Salvador',     taxIdLabel: 'NIT',       taxIdPlaceholder: '0614-280199-101-1', taxName: 'IVA', taxRate: 13, currency: 'USD', currencySymbol: '$' },
  NI: { name: 'Nicaragua',       taxIdLabel: 'RUC',       taxIdPlaceholder: 'J0310000012345',taxName: 'IVA',  taxRate: 15, currency: 'NIO', currencySymbol: 'C$' },
  DO: { name: 'República Dominicana', taxIdLabel: 'RNC',  taxIdPlaceholder: '1-31-12345-6',  taxName: 'ITBIS',taxRate: 18, currency: 'DOP', currencySymbol: 'RD$' },
  PR: { name: 'Puerto Rico',     taxIdLabel: 'EIN',       taxIdPlaceholder: '12-3456789',    taxName: 'IVU',  taxRate: 11.5, currency: 'USD', currencySymbol: '$' },

  // 🇧🇷 Brasil y Portugal
  BR: { name: 'Brasil',          taxIdLabel: 'CNPJ',      taxIdPlaceholder: '12.345.678/0001-90', taxName: 'ICMS', taxRate: 17, currency: 'BRL', currencySymbol: 'R$' },
  PT: { name: 'Portugal',        taxIdLabel: 'NIF',       taxIdPlaceholder: '123456789',     taxName: 'IVA',  taxRate: 23, currency: 'EUR', currencySymbol: '€' },

  // 🇪🇸 Europa hispano/franco/alemana
  ES: { name: 'España',          taxIdLabel: 'NIF/CIF',   taxIdPlaceholder: 'B12345678',     taxName: 'IVA',  taxRate: 21, currency: 'EUR', currencySymbol: '€' },
  FR: { name: 'Francia',         taxIdLabel: 'SIRET',     taxIdPlaceholder: '123 456 789 00012', taxName: 'TVA', taxRate: 20, currency: 'EUR', currencySymbol: '€' },
  BE: { name: 'Bélgica',         taxIdLabel: 'BTW/TVA',   taxIdPlaceholder: 'BE0123456789',  taxName: 'TVA',  taxRate: 21, currency: 'EUR', currencySymbol: '€' },
  LU: { name: 'Luxemburgo',      taxIdLabel: 'TVA',       taxIdPlaceholder: 'LU12345678',    taxName: 'TVA',  taxRate: 17, currency: 'EUR', currencySymbol: '€' },
  CH: { name: 'Suiza',           taxIdLabel: 'IDE',       taxIdPlaceholder: 'CHE-123.456.789', taxName: 'MWST', taxRate: 8.1, currency: 'CHF', currencySymbol: 'CHF' },
  IT: { name: 'Italia',          taxIdLabel: 'P. IVA',    taxIdPlaceholder: 'IT12345678901', taxName: 'IVA',  taxRate: 22, currency: 'EUR', currencySymbol: '€' },
  DE: { name: 'Alemania',        taxIdLabel: 'USt-IdNr.', taxIdPlaceholder: 'DE123456789',   taxName: 'MwSt', taxRate: 19, currency: 'EUR', currencySymbol: '€' },
  NL: { name: 'Países Bajos',    taxIdLabel: 'BTW',       taxIdPlaceholder: 'NL123456789B01',taxName: 'BTW',  taxRate: 21, currency: 'EUR', currencySymbol: '€' },
  IE: { name: 'Irlanda',         taxIdLabel: 'VAT',       taxIdPlaceholder: 'IE1234567T',    taxName: 'VAT',  taxRate: 23, currency: 'EUR', currencySymbol: '€' },

  // 🇬🇧 Reino Unido
  GB: { name: 'Reino Unido',     taxIdLabel: 'VAT',       taxIdPlaceholder: 'GB123456789',   taxName: 'VAT',  taxRate: 20, currency: 'GBP', currencySymbol: '£' },

  // 🇺🇸 Norteamérica
  US: { name: 'Estados Unidos',  taxIdLabel: 'EIN',       taxIdPlaceholder: '12-3456789',    taxName: 'Sales Tax', taxRate: 0,  currency: 'USD', currencySymbol: '$' },
  CA: { name: 'Canadá',          taxIdLabel: 'BN',        taxIdPlaceholder: '123456789RT0001', taxName: 'GST', taxRate: 5,  currency: 'CAD', currencySymbol: '$' },

  // 🌏 Asia / Oceanía
  AU: { name: 'Australia',       taxIdLabel: 'ABN',       taxIdPlaceholder: '12 345 678 901',taxName: 'GST',  taxRate: 10, currency: 'AUD', currencySymbol: '$' },
  NZ: { name: 'Nueva Zelanda',   taxIdLabel: 'GST',       taxIdPlaceholder: '123-456-789',   taxName: 'GST',  taxRate: 15, currency: 'NZD', currencySymbol: '$' },
  IN: { name: 'India',           taxIdLabel: 'GSTIN',     taxIdPlaceholder: '12ABCDE1234F1Z5',taxName: 'GST', taxRate: 18, currency: 'INR', currencySymbol: '₹' },
  JP: { name: 'Japón',           taxIdLabel: '法人番号',   taxIdPlaceholder: '1234567890123', taxName: 'Tax',  taxRate: 10, currency: 'JPY', currencySymbol: '¥' },
};

// Fallback genérico para cuando el país del usuario no esté en la lista
export const DEFAULT_COUNTRY_CONFIG = {
  name: 'Otro',
  taxIdLabel: 'Tax ID',
  taxIdPlaceholder: '000.000.000-0',
  taxName: 'IVA',
  taxRate: 0,
  currency: 'USD',
  currencySymbol: '$',
};

/**
 * Resuelve la configuración por país.
 * Acepta tanto código ISO ("CO", "BR") como nombre del país ("Colombia").
 */
export const getCountryConfig = (countryOrCode) => {
  if (!countryOrCode) return DEFAULT_COUNTRY_CONFIG;
  const raw = String(countryOrCode).trim();
  const code = raw.toUpperCase();

  // Match directo por código
  if (COUNTRY_CONFIG[code]) return { code, ...COUNTRY_CONFIG[code] };

  // Match por nombre (case-insensitive)
  const normalized = raw.toLowerCase();
  for (const [c, cfg] of Object.entries(COUNTRY_CONFIG)) {
    if (cfg.name.toLowerCase() === normalized) return { code: c, ...cfg };
  }

  return DEFAULT_COUNTRY_CONFIG;
};

/** Lista ordenada alfabéticamente para usar en un <Select>. */
export const COUNTRY_LIST = Object.entries(COUNTRY_CONFIG)
  .map(([code, cfg]) => ({ code, ...cfg }))
  .sort((a, b) => a.name.localeCompare(b.name));

/** Lista de monedas únicas con su símbolo, para selector de moneda. */
export const CURRENCY_LIST = (() => {
  const seen = new Set();
  const out = [];
  for (const cfg of Object.values(COUNTRY_CONFIG)) {
    if (!seen.has(cfg.currency)) {
      seen.add(cfg.currency);
      out.push({ code: cfg.currency, symbol: cfg.currencySymbol });
    }
  }
  return out.sort((a, b) => a.code.localeCompare(b.code));
})();

// Traducciones del nombre del país por idioma (para usarlo en textos dinámicos).
// Si un idioma no está, cae al nombre en español del COUNTRY_CONFIG.
const COUNTRY_NAME_TRANSLATIONS = {
  CO: { es: 'Colombia',    en: 'Colombia',     pt: 'Colômbia',     fr: 'Colombie' },
  MX: { es: 'México',      en: 'Mexico',       pt: 'México',       fr: 'Mexique' },
  AR: { es: 'Argentina',   en: 'Argentina',    pt: 'Argentina',    fr: 'Argentine' },
  CL: { es: 'Chile',       en: 'Chile',        pt: 'Chile',        fr: 'Chili' },
  PE: { es: 'Perú',        en: 'Peru',         pt: 'Peru',         fr: 'Pérou' },
  VE: { es: 'Venezuela',   en: 'Venezuela',    pt: 'Venezuela',    fr: 'Venezuela' },
  EC: { es: 'Ecuador',     en: 'Ecuador',      pt: 'Equador',      fr: 'Équateur' },
  BO: { es: 'Bolivia',     en: 'Bolivia',      pt: 'Bolívia',      fr: 'Bolivie' },
  PY: { es: 'Paraguay',    en: 'Paraguay',     pt: 'Paraguai',     fr: 'Paraguay' },
  UY: { es: 'Uruguay',     en: 'Uruguay',      pt: 'Uruguai',      fr: 'Uruguay' },
  CR: { es: 'Costa Rica',  en: 'Costa Rica',   pt: 'Costa Rica',   fr: 'Costa Rica' },
  PA: { es: 'Panamá',      en: 'Panama',       pt: 'Panamá',       fr: 'Panama' },
  GT: { es: 'Guatemala',   en: 'Guatemala',    pt: 'Guatemala',    fr: 'Guatemala' },
  HN: { es: 'Honduras',    en: 'Honduras',     pt: 'Honduras',     fr: 'Honduras' },
  SV: { es: 'El Salvador', en: 'El Salvador',  pt: 'El Salvador',  fr: 'Salvador' },
  NI: { es: 'Nicaragua',   en: 'Nicaragua',    pt: 'Nicarágua',    fr: 'Nicaragua' },
  DO: { es: 'República Dominicana', en: 'Dominican Republic', pt: 'República Dominicana', fr: 'République Dominicaine' },
  PR: { es: 'Puerto Rico', en: 'Puerto Rico',  pt: 'Porto Rico',   fr: 'Porto Rico' },
  BR: { es: 'Brasil',      en: 'Brazil',       pt: 'Brasil',       fr: 'Brésil' },
  PT: { es: 'Portugal',    en: 'Portugal',     pt: 'Portugal',     fr: 'Portugal' },
  ES: { es: 'España',      en: 'Spain',        pt: 'Espanha',      fr: 'Espagne' },
  FR: { es: 'Francia',     en: 'France',       pt: 'França',       fr: 'France' },
  BE: { es: 'Bélgica',     en: 'Belgium',      pt: 'Bélgica',      fr: 'Belgique' },
  LU: { es: 'Luxemburgo',  en: 'Luxembourg',   pt: 'Luxemburgo',   fr: 'Luxembourg' },
  CH: { es: 'Suiza',       en: 'Switzerland',  pt: 'Suíça',        fr: 'Suisse' },
  IT: { es: 'Italia',      en: 'Italy',        pt: 'Itália',       fr: 'Italie' },
  DE: { es: 'Alemania',    en: 'Germany',      pt: 'Alemanha',     fr: 'Allemagne' },
  NL: { es: 'Países Bajos',en: 'Netherlands',  pt: 'Países Baixos',fr: 'Pays-Bas' },
  IE: { es: 'Irlanda',     en: 'Ireland',      pt: 'Irlanda',      fr: 'Irlande' },
  GB: { es: 'Reino Unido', en: 'United Kingdom', pt: 'Reino Unido',fr: 'Royaume-Uni' },
  US: { es: 'Estados Unidos', en: 'the United States', pt: 'Estados Unidos', fr: 'aux États-Unis' },
  CA: { es: 'Canadá',      en: 'Canada',       pt: 'Canadá',       fr: 'Canada' },
  AU: { es: 'Australia',   en: 'Australia',    pt: 'Austrália',    fr: 'Australie' },
  NZ: { es: 'Nueva Zelanda',en: 'New Zealand', pt: 'Nova Zelândia',fr: 'Nouvelle-Zélande' },
  IN: { es: 'India',       en: 'India',        pt: 'Índia',        fr: 'Inde' },
  JP: { es: 'Japón',       en: 'Japan',        pt: 'Japão',        fr: 'Japon' },
};

/** Fallback regional cuando no se logra detectar país. */
const REGION_FALLBACK = {
  es: 'Latinoamérica',
  en: 'Latin America',
  pt: 'América Latina',
  fr: 'Amérique Latine',
};

/**
 * Devuelve el nombre traducido del país para mostrar en textos.
 *   getCountryName('CO', 'es') -> 'Colombia'
 *   getCountryName('BR', 'fr') -> 'Brésil'
 *   getCountryName(null, 'es') -> 'Latinoamérica'  (fallback regional)
 */
export const getCountryName = (countryOrCode, language = 'es') => {
  const lang = (language || 'es').toLowerCase().split('-')[0];
  const fallback = REGION_FALLBACK[lang] || REGION_FALLBACK.es;
  if (!countryOrCode) return fallback;
  const cfg = getCountryConfig(countryOrCode);
  if (!cfg || !cfg.code) return fallback;
  const tr = COUNTRY_NAME_TRANSLATIONS[cfg.code];
  if (tr && tr[lang]) return tr[lang];
  return cfg.name || fallback;
};

export default COUNTRY_CONFIG;
