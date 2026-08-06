import { primeNgLicense } from './primeng-license';

export const environment = {
  production: false,
  composeDemo: false,
  apiBaseUrl: 'https://uqujnhmk31.execute-api.us-east-1.amazonaws.com',
  ragPath: '/api/rag',
  agentPath: '/agent',
  historyPath: '/agent',
  demoTenantId: '',
  demoUserId: '',
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_eeMuYPlMK',
    clientId: '1a4ao09ljbohofa0377sm82alu',
  },
  /** Filled via fileReplacements → primeng-license.local.ts in development. */
  primeNgLicense,
};
