import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
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
  /**
   * Read custom:tenant_id for an existing user (reuse / registry restore).
   * Returns null if the attribute is missing.
   */
  getUserTenantId(email: string): Promise<string | null>;
  /** Ensure the user is in the Cognito group for the municipal role. */
  ensureUserInRoleGroup(email: string, role: AssignableTenantRole): Promise<void>;
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
    await this.ensureUserInRoleGroup(input.email, input.role);
  }

  async getUserTenantId(email: string): Promise<string | null> {
    const res = await this.client.send(
      new AdminGetUserCommand({
        UserPoolId: this.userPoolId,
        Username: email,
      }),
    );
    const attr = (res.UserAttributes ?? []).find((a) => a.Name === 'custom:tenant_id');
    const v = attr?.Value?.trim();
    return v || null;
  }

  async ensureUserInRoleGroup(
    email: string,
    role: AssignableTenantRole,
  ): Promise<void> {
    await this.client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: email,
        GroupName: COGNITO_GROUP_BY_ROLE[role],
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
