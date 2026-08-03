import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Handler } from 'aws-lambda';

/** HTTP API event with optional JWT authorizer claims (Cognito). */
export type AuthedEvent = APIGatewayProxyEventV2 & {
  requestContext: APIGatewayProxyEventV2['requestContext'] & {
    authorizer?: {
      jwt?: {
        claims?: Record<string, unknown>;
      };
    };
  };
};

export type AuthedHandler = Handler<AuthedEvent, APIGatewayProxyResultV2>;
