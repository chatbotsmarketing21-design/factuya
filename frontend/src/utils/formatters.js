// Formateadores regionales (#30.c)
//
// Centraliza el formato de números, monedas y fechas según el país del usuario.
// Si el usuario no tiene país en su perfil, cae a 'es-CO' (default histórico).
//
// USO:
//   import { formatCurrency, formatDate, getUserLocale } from '../utils/formatters';
//   formatCurrency(123456.78, { country: companyInfo.country })
//   formatDate('2026-05-27', { country: companyInfo.country })

import { getCountryConfig } from '../constants/countryConfig';

// Mapeo país → locale BCP-47 más apropiado para formato regional.
// (No es ISO 3166; usa el locale "natural" para cada país.)
const COUNTRY_TO_LOCALE = {
  CO: 'es-CO', MX: 'es-MX', AR: 'es-AR', CL: 'es-CL', PE: 'es-PE',
  VE: 'es-VE', EC: 'es-EC', BO: 'es-BO', PY: 'es-PY', UY: 'es-UY',
  CR: 'es-CR', PA: 'es-PA', GT: 'es-GT', HN: 'es-HN', SV: 'es-SV',
  NI: 'es-NI', DO: 'es-DO', PR: 'es-PR',
  BR: 'pt-BR', PT: 'pt-PT',
  ES: 'es-ES', FR: 'fr-FR', BE: 'fr-BE', LU: 'fr-LU', CH: 'de-CH',
  IT: 'it-IT', DE: 'de-DE', NL: 'nl-NL', IE: 'en-IE',
  GB: 'en-GB', US: 'en-US', CA: 'en-CA',
  AU: 'en-AU', NZ: 'en-NZ', IN: 'en-IN', JP: 'ja-JP',
};

/**
 * Resuelve el locale BCP-47 a partir del país del usuario.
 * Acepta tanto código ISO ("CO") como nombre ("Colombia").
 * Si no se puede resolver, retorna 'es-CO'.
 */
export const getUserLocale = (countryOrCode) => {
  if (!countryOrCode) return 'es-CO';
  const cfg = getCountryConfig(countryOrCode);
  return (cfg && cfg.code && COUNTRY_TO_LOCALE[cfg.code]) || 'es-CO';
};

/**
 * Formatea un número como cantidad de dinero según el país.
 * Devuelve solo los dígitos formateados (sin símbolo de moneda) para
 * permitir que cada plantilla controle si pinta el símbolo o no.
 *
 *   formatCurrency(1234567.89, { country: 'CO' }) -> "1.234.567,89"
 *   formatCurrency(1234567.89, { country: 'US' }) -> "1,234,567.89"
 *   formatCurrency(1234567.89, { country: 'BR' }) -> "1.234.567,89"
 */
export const formatCurrency = (value, { country, locale, minimumFractionDigits = 0, maximumFractionDigits = 2 } = {}) => {
  const num = Number(value) || 0;
  const lc = locale || getUserLocale(country);
  return num.toLocaleString(lc, { minimumFractionDigits, maximumFractionDigits });
};

/**
 * Formatea una fecha (Date o string ISO) según el país del usuario.
 *
 *   formatDate('2026-05-27', { country: 'CO' }) -> "27/05/2026"
 *   formatDate('2026-05-27', { country: 'US' }) -> "5/27/2026"
 *   formatDate('2026-05-27', { country: 'BR' }) -> "27/05/2026"
 *
 * Para fechas tipo "YYYY-MM-DD" sin hora, se interpretan en zona local
 * (evita el clásico bug de "se ve un día menos por UTC").
 */
export const formatDate = (input, { country, locale, options } = {}) => {
  if (!input) return '';
  const lc = locale || getUserLocale(country);
  let date;
  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date(input);
  }
  if (isNaN(date.getTime())) return String(input);
  const opts = options || { day: '2-digit', month: '2-digit', year: 'numeric' };
  return date.toLocaleDateString(lc, opts);
};

/**
 * Símbolo de moneda según el país.
 *   getCurrencySymbol('CO') -> '$'
 *   getCurrencySymbol('BR') -> 'R$'
 *   getCurrencySymbol('EU') (España, Francia, etc.) -> '€'
 */
export const getCurrencySymbol = (country) => {
  const cfg = getCountryConfig(country);
  return cfg.currencySymbol;
};
