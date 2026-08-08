import { primeNgLicense } from './primeng-license';

export const environment = {
  production: false,
  composeDemo: false,
  apiBaseUrl: 'https://f5z7yqud5c.execute-api.us-east-1.amazonaws.com',
  /** Cognito SPA uses POST /agent only — Compose /api/rag is unused here. */
  ragPath: '',
  agentPath: '/agent',
  historyPath: '/agent',
  demoTenantId: '',
  demoUserId: '',
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_bCzPVJFN2',
    clientId: '6l2345lb7npfku66v80j0r6qek',
  },
  /** Filled via fileReplacements → primeng-license.local.ts in development. */
  primeNgLicense,
};
