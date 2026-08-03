import { primeNgLicense } from './primeng-license';

export const environment = {
  production: false,
  apiBaseUrl: 'https://14jxov7h72.execute-api.us-east-2.amazonaws.com',
  cognito: {
    region: 'us-east-2',
    userPoolId: 'us-east-2_oHpsTZZAN',
    clientId: '5fd9gii0m2aaibpn1j261pmfo9',
  },
  /** Filled via fileReplacements → primeng-license.local.ts in development. */
  primeNgLicense,
};
