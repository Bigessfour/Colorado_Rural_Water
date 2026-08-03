import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { MeterLocation, MeterReading } from './meter-location.js';
import type { MeterStore } from './ingest.js';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

function pk(tenantId: string): string {
  return `TENANT#${tenantId}`;
}

function locSk(meterId: string): string {
  return `LOC#${meterId}`;
}

function rdgSk(meterId: string, timestamp: string): string {
  return `RDG#${meterId}#${timestamp}`;
}

function mapSk(kind: string): string {
  return `MAP#${kind}`;
}

export class DynamoMeterStore implements MeterStore {
  constructor(private readonly tableName: string) {}

  async getLocation(tenantId: string, meterId: string): Promise<MeterLocation | null> {
    const res = await client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: pk(tenantId), sk: locSk(meterId) },
      }),
    );
    if (!res.Item) return null;
    return itemToLocation(res.Item);
  }

  async putLocation(location: MeterLocation): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(location.tenantId),
          sk: locSk(location.meterId),
          entityType: 'meter_location',
          tenantId: location.tenantId,
          meterId: location.meterId,
          serviceAddress: location.serviceAddress,
          occupantName: location.occupantName,
          accountNumber: location.accountNumber,
          route: location.route,
          meterSize: location.meterSize,
          installDate: location.installDate,
          updatedAt: location.updatedAt,
        },
      }),
    );
  }

  async putReading(reading: MeterReading): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(reading.tenantId),
          sk: rdgSk(reading.meterId, reading.timestamp),
          entityType: 'meter_reading',
          tenantId: reading.tenantId,
          meterId: reading.meterId,
          serviceAddress: reading.serviceAddress,
          occupantName: reading.occupantName,
          timestamp: reading.timestamp,
          cumulativeReading: reading.cumulativeReading,
          unit: reading.unit,
          diagnosticFlags: reading.diagnosticFlags,
        },
      }),
    );
  }

  async putMapping(
    tenantId: string,
    kind: string,
    mapping: Record<string, string>,
  ): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(tenantId),
          sk: mapSk(kind),
          entityType: 'column_mapping',
          tenantId,
          kind,
          mapping,
          updatedAt: new Date().toISOString(),
        },
      }),
    );
  }

  async getMapping(tenantId: string, kind: string): Promise<Record<string, string> | null> {
    const res = await client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: pk(tenantId), sk: mapSk(kind) },
      }),
    );
    const mapping = res.Item?.mapping;
    return mapping && typeof mapping === 'object'
      ? (mapping as Record<string, string>)
      : null;
  }

  async listLocations(tenantId: string): Promise<MeterLocation[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': pk(tenantId),
          ':sk': 'LOC#',
        },
      }),
    );
    return (res.Items ?? []).map(itemToLocation);
  }

  async listReadings(tenantId: string): Promise<MeterReading[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': pk(tenantId),
          ':sk': 'RDG#',
        },
      }),
    );
    return (res.Items ?? []).map(itemToReading);
  }
}

function itemToLocation(item: Record<string, unknown>): MeterLocation {
  return {
    tenantId: String(item.tenantId),
    meterId: String(item.meterId),
    serviceAddress: String(item.serviceAddress),
    occupantName: (item.occupantName as string | null) ?? null,
    accountNumber: (item.accountNumber as string | null) ?? null,
    route: (item.route as string | null) ?? null,
    meterSize: (item.meterSize as string | null) ?? null,
    installDate: (item.installDate as string | null) ?? null,
    updatedAt: String(item.updatedAt ?? new Date().toISOString()),
  };
}

function itemToReading(item: Record<string, unknown>): MeterReading {
  const flags = item.diagnosticFlags;
  return {
    tenantId: String(item.tenantId),
    meterId: String(item.meterId),
    serviceAddress: String(item.serviceAddress),
    occupantName: (item.occupantName as string | null) ?? null,
    timestamp: String(item.timestamp),
    cumulativeReading: Number(item.cumulativeReading),
    unit: String(item.unit ?? 'gal'),
    diagnosticFlags: Array.isArray(flags) ? flags.map(String) : [],
  };
}

export function createMeterStoreFromEnv(): MeterStore {
  const table = process.env.DATA_TABLE;
  if (!table) {
    throw new Error('DATA_TABLE env is not configured');
  }
  return new DynamoMeterStore(table);
}
