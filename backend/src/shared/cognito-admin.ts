import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import { COGNITO_GROUP_BY_ROLE, type AssignableTenantRole } from './auth.js';

export interface CognitoAdminClient {
  createMunicipalUser(input: {
    email: string;
    tenantId: string;
    role: AssignableTenantRole;
    temporaryPassword: string;
  }): Promise<void>;
}

export class AwsCognitoAdminClient implements CognitoAdminClient {
  constructor(
    private readonly userPoolId: string,
    private readonly client = new CognitoIdentityProviderClient({}),
  ) {}

  async createMunicipalUser(input: {
    email: string;
    tenantId: string;
    role: AssignableTenantRole;
    temporaryPassword: string;
  }): Promise<void> {
    await this.client.send(
      new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: input.email,
        TemporaryPassword: input.temporaryPassword,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: input.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:tenant_id', Value: input.tenantId },
        ],
      }),
    );
    await this.client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: input.email,
        GroupName: COGNITO_GROUP_BY_ROLE[input.role],
      }),
    );
  }
}

export function createCognitoAdminFromEnv(): CognitoAdminClient {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID env is not configured');
  }
  return new AwsCognitoAdminClient(userPoolId);
}
