import { primeNgLicense } from './primeng-license';

/**
 * Dev SPA → live Code Platoon API Gateway (Assessment III).
 * Use http://localhost:4200 (not 127.0.0.1) so Cognito/API CORS match.
 * composeDemo=false → Cognito JWT path (Kelly upload → dashboard → alerts).
 *
 * After terraform destroy/re-apply, refresh apiBaseUrl + cognito IDs from:
 *   terraform -chdir=infra/terraform output
 */
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
  primeNgLicense,
};
