// Formateo de teléfonos por país (#30.e)
// Usa libphonenumber-js (Google). Soporta 195 países.

import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js';
import { getCountryConfig } from '../constants/countryConfig';

/**
 * Convierte un nombre de país o código ISO al código ISO 3166-1 alpha-2
 * que libphonenumber-js espera (ej: "CO", "MX", "US").
 */
const resolveIsoCode = (countryOrCode) => {
  if (!countryOrCode) return undefined;
  const cfg = getCountryConfig(countryOrCode);
  return cfg && cfg.code !== undefined ? cfg.code : undefined;
};

/**
 * Formatea un teléfono mientras el usuario escribe.
 * Devuelve el texto formateado para mostrar en el input.
 *
 *   formatPhoneAsYouType('3136757408', 'Colombia')  -> '313 675 7408'
 *   formatPhoneAsYouType('+57 3136757408', 'CO')    -> '+57 313 675 7408'
 *   formatPhoneAsYouType('5512345678', 'México')    -> '55 1234 5678'
 *
 * Si el usuario empieza con `+`, se interpreta como internacional y el código de país
 * se respeta tal cual lo escriba.
 */
export const formatPhoneAsYouType = (raw, country) => {
  if (raw == null) return '';
  const text = String(raw);
  const iso = resolveIsoCode(country);
  try {
    return new AsYouType(iso).input(text);
  } catch (_) {
    return text;
  }
};

/**
 * Devuelve la versión "limpia" en formato internacional E.164 (ej: "+573136757408")
 * si el número es válido para el país dado. Si no es válido, devuelve el original.
 * Útil para guardar en la base de datos / usar en `tel:` o `wa.me/`.
 */
export const toInternationalPhone = (raw, country) => {
  if (!raw) return '';
  const iso = resolveIsoCode(country);
  try {
    const parsed = parsePhoneNumberFromString(String(raw), iso);
    if (parsed && parsed.isValid()) return parsed.number;
  } catch (_) { /* noop */ }
  return String(raw);
};
