/**
 * Feature 014 — soft per-tenant hourly cap for Cognito /agent (Dynamo counter).
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function hourBucket(d = new Date()): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}${String(d.getUTCHours()).padStart(2, "0")}`;
}

export function agentRateLimitPerHour(): number {
  const n = Number(process.env.AGENT_RATE_LIMIT_HOUR ?? "60");
  return Number.isFinite(n) && n > 0 ? n : 60;
}

/**
 * Atomically reserve one agent slot for the tenant hour-bucket.
 * Uses a conditional increment so concurrent requests cannot exceed the limit.
 */
export async function checkAndIncrementAgentRate(
  tenantId: string,
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const table = process.env.DATA_TABLE?.trim();
  const limit = agentRateLimitPerHour();
  if (!table) {
    return { allowed: true, remaining: limit, limit };
  }

  const pk = `TENANT#${tenantId}`;
  const sk = `META#agent_rate#${hourBucket()}`;

  try {
    const updated = await ddb.send(
      new UpdateCommand({
        TableName: table,
        Key: { pk, sk },
        UpdateExpression:
          "SET #c = if_not_exists(#c, :zero) + :one, updatedAt = :now",
        ConditionExpression: "attribute_not_exists(#c) OR #c < :limit",
        ExpressionAttributeNames: { "#c": "count" },
        ExpressionAttributeValues: {
          ":zero": 0,
          ":one": 1,
          ":limit": limit,
          ":now": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      }),
    );
    const count = Number(updated.Attributes?.count ?? 1);
    return {
      allowed: true,
      remaining: Math.max(0, limit - count),
      limit,
    };
  } catch (err) {
    const name =
      err && typeof err === "object" && "name" in err
        ? String((err as { name?: string }).name)
        : "";
    if (name === "ConditionalCheckFailedException") {
      return { allowed: false, remaining: 0, limit };
    }
    console.warn("agent-rate-limit: allowing request after error", err);
    return { allowed: true, remaining: limit, limit };
  }
}
