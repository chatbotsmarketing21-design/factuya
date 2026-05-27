import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'pt', label: 'Português', short: 'PT' },
  { code: 'fr', label: 'Français', short: 'FR' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    // Mark this as a manual choice so the geo-based auto-detector won't override it.
    try {
      localStorage.setItem('i18nextLngManual', 'true');
    } catch (e) {
      // ignore storage errors
    }
  };

  // Match short codes like 'es-CO' to 'es'
  const currentCode = (i18n.language || 'es').toLowerCase().split('-')[0];
  const current = LANGUAGES.find((l) => l.code === currentCode) || LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" data-testid="lang-switcher-btn">
          <Globe className="w-4 h-4" />
          {current.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lng) => (
          <DropdownMenuItem
            key={lng.code}
            onClick={() => changeLanguage(lng.code)}
            data-testid={`lang-switcher-${lng.code}`}
          >
            {lng.short} {lng.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
