import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { subscriptionAPI } from '../services/subscriptionApi';

const STORAGE_KEY_MANUAL = 'i18nextLngManual';

/**
 * Detects the user's country on first load and applies the matching UI language.
 *
 * Behavior:
 * - If the user has manually picked a language (via LanguageSwitcher), respect it forever.
 * - Otherwise, hit /api/geo/detect once and switch to the suggested language.
 *
 * Renders nothing.
 */
const GeoLanguageDetector = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // If the user has manually chosen a language before, never override.
    if (localStorage.getItem(STORAGE_KEY_MANUAL) === 'true') return;

    let cancelled = false;
    subscriptionAPI
      .detectCountry()
      .then((res) => {
        if (cancelled) return;
        const lng = res.data?.suggested_language;
        if (lng && lng !== i18n.language && ['es', 'en'].includes(lng)) {
          i18n.changeLanguage(lng);
        }
      })
      .catch(() => {
        // Silent fail: keep existing language
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default GeoLanguageDetector;
