
import { translations } from '../lib/translations';
import { AppSettings } from '../types';

export const useTranslation = (language: AppSettings['language']) => {
  const t = (key: keyof typeof translations['en']) => {
    const dict = translations[language] || translations['en'];
    return dict[key] || translations['en'][key] || key;
  };

  return { t };
};
