import type { APIGatewayProxyResult } from 'aws-lambda';

export function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization,content-type',
    },
    body: JSON.stringify(body),
  };
}

export function ok(body: unknown): APIGatewayProxyResult {
  return json(200, body);
}

export function badRequest(message: string): APIGatewayProxyResult {
  return json(400, { error: message });
}

export function unauthorized(message = 'Unauthorized'): APIGatewayProxyResult {
  return json(401, { error: message });
}

export function forbidden(message = 'Forbidden'): APIGatewayProxyResult {
  return json(403, { error: message });
}
