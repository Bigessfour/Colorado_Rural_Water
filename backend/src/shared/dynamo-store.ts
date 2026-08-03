import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { MeterLocation, MeterReading } from './meter-location.js';
import type { MeterStore } from './ingest.js';
import type { SourceStore } from './source-store.js';
import type { SourceType, WaterSource } from './water-source.js';
import { isSourceType } from './water-source.js';

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

function srcSk(sourceId: string): string {
  return `SRC#${sourceId}`;
}

export class DynamoMeterStore implements MeterStore, SourceStore {
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

  async listSources(tenantId: string): Promise<WaterSource[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': pk(tenantId),
          ':sk': 'SRC#',
        },
      }),
    );
    return (res.Items ?? [])
      .map(itemToSource)
      .filter((s): s is WaterSource => s !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getSource(tenantId: string, sourceId: string): Promise<WaterSource | null> {
    const res = await client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: pk(tenantId), sk: srcSk(sourceId) },
      }),
    );
    if (!res.Item) return null;
    return itemToSource(res.Item);
  }

  async putSource(source: WaterSource): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(source.tenantId),
          sk: srcSk(source.sourceId),
          entityType: 'water_source',
          tenantId: source.tenantId,
          sourceId: source.sourceId,
          name: source.name,
          type: source.type,
          unit: source.unit,
          notes: source.notes,
          createdAt: source.createdAt,
          updatedAt: source.updatedAt,
        },
      }),
    );
  }

  async deleteSource(tenantId: string, sourceId: string): Promise<boolean> {
    const existing = await this.getSource(tenantId, sourceId);
    if (!existing) return false;
    await client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { pk: pk(tenantId), sk: srcSk(sourceId) },
      }),
    );
    return true;
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

function itemToSource(item: Record<string, unknown>): WaterSource | null {
  const type = item.type;
  if (!isSourceType(type)) return null;
  return {
    tenantId: String(item.tenantId),
    sourceId: String(item.sourceId),
    name: String(item.name),
    type: type as SourceType,
    unit: String(item.unit ?? 'gal'),
    notes: (item.notes as string | null) ?? null,
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    updatedAt: String(item.updatedAt ?? new Date().toISOString()),
  };
}

export function createMeterStoreFromEnv(): MeterStore {
  const table = process.env.DATA_TABLE;
  if (!table) {
    throw new Error('DATA_TABLE env is not configured');
  }
  return new DynamoMeterStore(table);
}

export function createSourceStoreFromEnv(): SourceStore {
  const table = process.env.DATA_TABLE;
  if (!table) {
    throw new Error('DATA_TABLE env is not configured');
  }
  return new DynamoMeterStore(table);
}
