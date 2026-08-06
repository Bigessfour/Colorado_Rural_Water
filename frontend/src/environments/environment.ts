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
  primeNgLicense,
};
