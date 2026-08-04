import { primeNgLicense } from './primeng-license';

/**
 * Compose Assessment build — same-origin /api via nginx.
 * Demo tenant headers satisfy RAG isolation without Cognito in the container path.
 * Live AWS path continues to use environment.ts + Cognito JWT.
 */
export const environment = {
  production: true,
  composeDemo: true,
  apiBaseUrl: '',
  ragPath: '/api/rag',
  agentPath: '/api/agent',
  historyPath: '/api/history',
  demoTenantId: 'town-wiley',
  demoUserId: 'compose-demo',
  cognito: {
    region: 'us-east-1',
    userPoolId: '',
    clientId: '',
  },
  primeNgLicense,
};
