import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Aura preset tinted with CRWA logo navy (#2E3192).
 * Logo / site: https://www.crwa.net/
 */
export const CrwaAura = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef0fa',
      100: '#d5daf3',
      200: '#abb5e7',
      300: '#818fd9',
      400: '#5768c6',
      500: '#2e3192',
      600: '#282b7f',
      700: '#21246b',
      800: '#1b1d57',
      900: '#141644',
      950: '#0c0d2a',
    },
  },
});
