import { primeNgLicense } from './primeng-license';

/** Dev SPA → live Code Platoon API Gateway (Assessment III). */
export const environment = {
  production: false,
  composeDemo: false,
  apiBaseUrl: 'https://tz6rqlus7b.execute-api.us-east-1.amazonaws.com',
  ragPath: '/api/rag',
  agentPath: '/agent',
  historyPath: '/agent',
  demoTenantId: '',
  demoUserId: '',
  cognito: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_oZlKJ1y39',
    clientId: '3lbh20n9383nhraaioaa5is5an',
  },
  primeNgLicense,
};
