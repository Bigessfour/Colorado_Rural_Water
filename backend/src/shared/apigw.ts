/**
 * API Gateway HTTP API v2 types — Cognito JWT authorizer claims on the event.
 * Handlers read `event.requestContext.authorizer.jwt.claims` then `requireTenantId`.
 */

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";

/** HTTP API event with optional JWT authorizer claims (Cognito). */
export type AuthedEvent = APIGatewayProxyEventV2 & {
  requestContext: APIGatewayProxyEventV2["requestContext"] & {
    authorizer?: {
      jwt?: {
        claims?: Record<string, unknown>;
      };
    };
  };
};

export type AuthedHandler = Handler<AuthedEvent, APIGatewayProxyResultV2>;
