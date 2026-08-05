import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  AwsCognitoAdminClient,
  createCognitoAdminFromEnv,
} from "./cognito-admin.js";

describe("cognito-admin env wiring", () => {
  const prevPool = process.env.COGNITO_USER_POOL_ID;

  afterEach(() => {
    if (prevPool === undefined) delete process.env.COGNITO_USER_POOL_ID;
    else process.env.COGNITO_USER_POOL_ID = prevPool;
  });

  it("createCognitoAdminFromEnv throws without user pool id", () => {
    delete process.env.COGNITO_USER_POOL_ID;
    assert.throws(
      () => createCognitoAdminFromEnv(),
      /COGNITO_USER_POOL_ID env is not configured/,
    );
  });

  it("createCognitoAdminFromEnv returns AwsCognitoAdminClient when configured", () => {
    process.env.COGNITO_USER_POOL_ID = "us-east-1_testpool";
    const client = createCognitoAdminFromEnv();
    assert.ok(client instanceof AwsCognitoAdminClient);
  });
});
