import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ok } from '../shared/http.js';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  return ok({
    service: 'water-saver',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};
