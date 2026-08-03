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

/** CSV download response (ticket C4). */
export function csv(body: string, filename: string): APIGatewayProxyResult {
  const safeName = filename.replace(/[^\w.\-]+/g, '_');
  return {
    statusCode: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${safeName}"`,
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-expose-headers': 'content-disposition',
    },
    body,
  };
}

export function badRequest(message: string, extra?: Record<string, unknown>): APIGatewayProxyResult {
  return json(400, { error: message, ...extra });
}

export function unauthorized(message = 'Unauthorized'): APIGatewayProxyResult {
  return json(401, { error: message });
}

export function forbidden(message = 'Forbidden'): APIGatewayProxyResult {
  return json(403, { error: message });
}
