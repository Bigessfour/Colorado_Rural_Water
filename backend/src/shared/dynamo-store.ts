import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  AlertActivityEvent,
  AlertStatusRecord,
  AlertStatusStore,
} from './alert-status.js';
import { alertActivitySk, meterKeyForActivity } from './alert-status.js';
import type {
  BalanceThresholdConfig,
  BalanceThresholdStore,
} from './balance-thresholds.js';
import type { MeterLocation, MeterReading } from './meter-location.js';
import type { MeterStore } from './ingest.js';
import type { SourceReading, SourceVolumeMode } from './source-reading.js';
import type { SourceStore } from './source-store.js';
import type {
  BillingEvent,
  BillingMode,
  BillingStatus,
  PlanCode,
} from './billing.js';
import { billEventSk, isBillingMode, isBillingStatus, isPlanCode } from './billing.js';
import type {
  ConversationMessage,
  ConversationStore,
} from './conversation.js';
import { conversationSk } from './conversation.js';
import type {
  OnboardingIntake,
  OnboardingStore,
} from './onboarding-intake.js';
import type {
  TenantProfile,
  TenantStore,
  TenantUserRecord,
} from './tenant-admin.js';
import type { SourceType, WaterSource } from './water-source.js';
import { isSourceType } from './water-source.js';
import type { AssignableTenantRole } from './auth.js';

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

function srdSk(sourceId: string, timestamp: string): string {
  return `SRD#${sourceId}#${timestamp}`;
}

function alertStatusSk(alertId: string): string {
  return `ALERT#STATUS#${alertId}`;
}

const BALANCE_THRESHOLDS_SK = 'CFG#balance_thresholds';
const META_PROFILE_SK = 'META#profile';
const META_ONBOARDING_SK = 'META#onboarding';
/** Synthetic tenant partition for CRWA tenant registry (stays under TENANT#* IAM). */
const REGISTRY_TENANT_ID = '_registry';

function userSk(email: string): string {
  return `USER#${email.toLowerCase()}`;
}

function registrySk(tenantId: string): string {
  return `TENANT#${tenantId}`;
}

const BILL_EVENT_SK_PREFIX = 'BILL#EVENT#';

function profileItemFields(profile: TenantProfile): Record<string, unknown> {
  return {
    tenantId: profile.tenantId,
    displayName: profile.displayName,
    createdAt: profile.createdAt,
    createdByUserId: profile.createdByUserId,
    createdByEmail: profile.createdByEmail,
    initialUserEmail: profile.initialUserEmail,
    billingStatus: profile.billingStatus,
    billingMode: profile.billingMode,
    planCode: profile.planCode,
    meterCountEstimate: profile.meterCountEstimate,
    retentionMonths: profile.retentionMonths,
    billingContactEmail: profile.billingContactEmail,
    pilotExpiresAt: profile.pilotExpiresAt,
    lastPaymentAt: profile.lastPaymentAt,
    billingNotes: profile.billingNotes,
    paymentProvider: profile.paymentProvider,
    mapTown: profile.mapTown ?? null,
    mapCenterLat: profile.mapCenterLat ?? null,
    mapCenterLng: profile.mapCenterLng ?? null,
    mapZoom: profile.mapZoom ?? null,
  };
}

export class DynamoMeterStore
  implements
    MeterStore,
    SourceStore,
    AlertStatusStore,
    BalanceThresholdStore,
    TenantStore,
    OnboardingStore,
    ConversationStore
{
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
          manufacturer: location.manufacturer,
          model: location.model,
          serialNumber: location.serialNumber,
          meterSize: location.meterSize,
          installDate: location.installDate,
          meterType: location.meterType,
          locationDetail: location.locationDetail,
          radioId: location.radioId,
          lastTestedAt: location.lastTestedAt,
          notes: location.notes,
          latitude: location.latitude,
          longitude: location.longitude,
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
    // Full tenant RDG# prefix query — OK for pilot. Harden with GSI / date bounds later.
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

  async deleteLocation(tenantId: string, meterId: string): Promise<boolean> {
    const existing = await this.getLocation(tenantId, meterId);
    if (!existing) return false;

    // Cascade delete RDG# for this meter (mirror SRC# → SRD# cascade).
    const readings = await this.listReadingsForMeter(tenantId, meterId);
    for (const r of readings) {
      await client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { pk: pk(tenantId), sk: rdgSk(r.meterId, r.timestamp) },
        }),
      );
    }

    await client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { pk: pk(tenantId), sk: locSk(meterId) },
      }),
    );
    return true;
  }

  async listReadingsForMeter(tenantId: string, meterId: string): Promise<MeterReading[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': pk(tenantId),
          ':sk': `RDG#${meterId}#`,
        },
      }),
    );
    return (res.Items ?? [])
      .map(itemToReading)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
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

    // Cascade delete SRD# for this source (pilot: avoid orphan readings in balance).
    const readings = await this.listSourceReadingsForSource(tenantId, sourceId);
    for (const r of readings) {
      await client.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { pk: pk(tenantId), sk: srdSk(r.sourceId, r.timestamp) },
        }),
      );
    }

    await client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { pk: pk(tenantId), sk: srcSk(sourceId) },
      }),
    );
    return true;
  }

  async putSourceReading(reading: SourceReading): Promise<void> {
    // Put on SRD#{sourceId}#{timestamp} upserts exact key; period-mode
    // double-count across different timestamps in the same YYYY-MM is
    // handled in sumSourceProduction (latest wins per source).
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(reading.tenantId),
          sk: srdSk(reading.sourceId, reading.timestamp),
          entityType: 'source_reading',
          tenantId: reading.tenantId,
          sourceId: reading.sourceId,
          sourceName: reading.sourceName,
          timestamp: reading.timestamp,
          value: reading.value,
          volumeMode: reading.volumeMode,
          unit: reading.unit,
          notes: reading.notes,
        },
      }),
    );
  }

  /**
   * Full tenant SRD# prefix scan — fine for pilot scale.
   * Ticket note: add GSI or tighter SK prefixes before large multi-year tenants.
   */
  async listSourceReadings(tenantId: string): Promise<SourceReading[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': pk(tenantId),
          ':sk': 'SRD#',
        },
      }),
    );
    return (res.Items ?? [])
      .map(itemToSourceReading)
      .filter((r): r is SourceReading => r !== null)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async listSourceReadingsForSource(
    tenantId: string,
    sourceId: string,
  ): Promise<SourceReading[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': pk(tenantId),
          ':sk': `SRD#${sourceId}#`,
        },
      }),
    );
    return (res.Items ?? [])
      .map(itemToSourceReading)
      .filter((r): r is SourceReading => r !== null)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async putAlertStatus(record: AlertStatusRecord): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(record.tenantId),
          sk: alertStatusSk(record.alertId),
          entityType: 'alert_status',
          tenantId: record.tenantId,
          alertId: record.alertId,
          status: record.status,
          actorUserId: record.actorUserId,
          actorEmail: record.actorEmail,
          updatedAt: record.updatedAt,
          note: record.note,
          meterId: record.meterId,
          summary: record.summary,
        },
      }),
    );
  }

  async getAlertStatus(tenantId: string, alertId: string): Promise<AlertStatusRecord | null> {
    const res = await client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: pk(tenantId), sk: alertStatusSk(alertId) },
      }),
    );
    if (!res.Item) return null;
    return itemToAlertStatus(res.Item);
  }

  async listAlertStatuses(tenantId: string): Promise<AlertStatusRecord[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': pk(tenantId),
          ':sk': 'ALERT#STATUS#',
        },
      }),
    );
    return (res.Items ?? [])
      .map(itemToAlertStatus)
      .filter((r): r is AlertStatusRecord => r !== null);
  }

  async putAlertActivity(event: AlertActivityEvent): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(event.tenantId),
          sk: alertActivitySk({
            meterId: event.meterId,
            createdAt: event.createdAt,
            alertId: event.alertId,
          }),
          entityType: 'alert_activity',
          tenantId: event.tenantId,
          eventId: event.eventId,
          alertId: event.alertId,
          meterId: event.meterId,
          action: event.action,
          status: event.status,
          actorUserId: event.actorUserId,
          actorEmail: event.actorEmail,
          note: event.note,
          summary: event.summary,
          createdAt: event.createdAt,
        },
      }),
    );
  }

  async putAlertStatusAndActivity(
    record: AlertStatusRecord,
    activity: AlertActivityEvent | null,
  ): Promise<void> {
    const statusItem = {
      pk: pk(record.tenantId),
      sk: alertStatusSk(record.alertId),
      entityType: 'alert_status',
      tenantId: record.tenantId,
      alertId: record.alertId,
      status: record.status,
      actorUserId: record.actorUserId,
      actorEmail: record.actorEmail,
      updatedAt: record.updatedAt,
      note: record.note,
      meterId: record.meterId,
      summary: record.summary,
    };

    if (!activity) {
      await this.putAlertStatus(record);
      return;
    }

    await client.send(
      new TransactWriteCommand({
        TransactItems: [
          { Put: { TableName: this.tableName, Item: statusItem } },
          {
            Put: {
              TableName: this.tableName,
              Item: {
                pk: pk(activity.tenantId),
                sk: alertActivitySk({
                  meterId: activity.meterId,
                  createdAt: activity.createdAt,
                  alertId: activity.alertId,
                }),
                entityType: 'alert_activity',
                tenantId: activity.tenantId,
                eventId: activity.eventId,
                alertId: activity.alertId,
                meterId: activity.meterId,
                action: activity.action,
                status: activity.status,
                actorUserId: activity.actorUserId,
                actorEmail: activity.actorEmail,
                note: activity.note,
                summary: activity.summary,
                createdAt: activity.createdAt,
              },
            },
          },
        ],
      }),
    );
  }

  async listAlertActivityForMeter(
    tenantId: string,
    meterId: string,
  ): Promise<AlertActivityEvent[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
        ExpressionAttributeValues: {
          ':pk': pk(tenantId),
          ':sk': `ALERT#EVT#${meterKeyForActivity(meterId)}#`,
        },
      }),
    );
    return (res.Items ?? [])
      .map(itemToAlertActivity)
      .filter((e): e is AlertActivityEvent => e !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getBalanceThresholds(tenantId: string): Promise<BalanceThresholdConfig | null> {
    const res = await client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: pk(tenantId), sk: BALANCE_THRESHOLDS_SK },
      }),
    );
    if (!res.Item) return null;
    return itemToBalanceThresholds(res.Item);
  }

  async putBalanceThresholds(config: BalanceThresholdConfig): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(config.tenantId),
          sk: BALANCE_THRESHOLDS_SK,
          entityType: 'balance_thresholds',
          tenantId: config.tenantId,
          lossPct: config.lossPct,
          lossGalMin: config.lossGalMin,
          gainTolerancePct: config.gainTolerancePct,
          gainGalMin: config.gainGalMin,
          updatedAt: config.updatedAt,
          updatedByUserId: config.updatedByUserId,
          updatedByEmail: config.updatedByEmail,
        },
      }),
    );
  }

  async getTenantProfile(tenantId: string): Promise<TenantProfile | null> {
    const res = await client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: pk(tenantId), sk: META_PROFILE_SK },
      }),
    );
    if (!res.Item) return null;
    return itemToTenantProfile(res.Item);
  }

  async putTenantProfile(profile: TenantProfile): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(profile.tenantId),
          sk: META_PROFILE_SK,
          entityType: 'tenant_profile',
          ...profileItemFields(profile),
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    );
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(REGISTRY_TENANT_ID),
          sk: registrySk(profile.tenantId),
          entityType: 'tenant_registry',
          ...profileItemFields(profile),
        },
      }),
    );
  }

  async updateTenantProfile(profile: TenantProfile): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(profile.tenantId),
          sk: META_PROFILE_SK,
          entityType: 'tenant_profile',
          ...profileItemFields(profile),
        },
      }),
    );
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(REGISTRY_TENANT_ID),
          sk: registrySk(profile.tenantId),
          entityType: 'tenant_registry',
          ...profileItemFields(profile),
        },
      }),
    );
  }

  async getOnboardingIntake(tenantId: string): Promise<OnboardingIntake | null> {
    const res = await client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: pk(tenantId), sk: META_ONBOARDING_SK },
      }),
    );
    if (!res.Item) return null;
    return itemToOnboardingIntake(res.Item);
  }

  async putOnboardingIntake(intake: OnboardingIntake): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(intake.tenantId),
          sk: META_ONBOARDING_SK,
          entityType: 'onboarding_intake',
          ...intake,
        },
      }),
    );
  }

  async listTenantProfiles(): Promise<TenantProfile[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: {
          ':pk': pk(REGISTRY_TENANT_ID),
          ':prefix': 'TENANT#',
        },
      }),
    );
    return (res.Items ?? [])
      .map((item) => itemToTenantProfile(item))
      .filter((p): p is TenantProfile => p !== null)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async listTenantUsers(tenantId: string): Promise<TenantUserRecord[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: {
          ':pk': pk(tenantId),
          ':prefix': 'USER#',
        },
      }),
    );
    return (res.Items ?? [])
      .map((item) => itemToTenantUser(item))
      .filter((u): u is TenantUserRecord => u !== null)
      .sort((a, b) => a.email.localeCompare(b.email));
  }

  async putTenantUser(user: TenantUserRecord): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(user.tenantId),
          sk: userSk(user.email),
          entityType: 'tenant_user',
          tenantId: user.tenantId,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          createdByUserId: user.createdByUserId,
          createdByEmail: user.createdByEmail,
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    );
  }

  async putBillingEvent(event: BillingEvent): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(event.tenantId),
          sk: billEventSk(event.createdAt, event.eventId),
          entityType: 'billing_event',
          tenantId: event.tenantId,
          eventId: event.eventId,
          createdAt: event.createdAt,
          eventType: event.eventType,
          source: event.source,
          billingStatusAfter: event.billingStatusAfter,
          amountCents: event.amountCents,
          currency: event.currency,
          method: event.method,
          actorUserId: event.actorUserId,
          actorEmail: event.actorEmail,
          note: event.note,
          pilotExpiresAt: event.pilotExpiresAt,
          externalEventId: event.externalEventId,
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    );
  }

  async listBillingEvents(tenantId: string, limit = 50): Promise<BillingEvent[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: {
          ':pk': pk(tenantId),
          ':prefix': BILL_EVENT_SK_PREFIX,
        },
        ScanIndexForward: false,
        Limit: Math.min(Math.max(limit, 1), 200),
      }),
    );
    return (res.Items ?? [])
      .map((item) => itemToBillingEvent(item))
      .filter((e): e is BillingEvent => e !== null);
  }

  async putMessage(msg: ConversationMessage): Promise<void> {
    await client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: pk(msg.tenantId),
          sk: conversationSk(msg.userId, msg.createdAt, msg.messageId),
          entityType: 'conversation_message',
          tenantId: msg.tenantId,
          userId: msg.userId,
          messageId: msg.messageId,
          role: msg.role,
          text: msg.text,
          createdAt: msg.createdAt,
          model: msg.model ?? null,
        },
      }),
    );
  }

  async listRecent(
    tenantId: string,
    userId: string,
    limit = 20,
  ): Promise<ConversationMessage[]> {
    const res = await client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: {
          ':pk': pk(tenantId),
          ':prefix': `CONV#${userId}#`,
        },
        ScanIndexForward: true,
      }),
    );
    const rows = (res.Items ?? [])
      .map((item) => itemToConversation(item))
      .filter((m): m is ConversationMessage => m !== null);
    return rows.slice(-Math.min(Math.max(limit, 1), 50));
  }

  async getTenantUser(tenantId: string, email: string): Promise<TenantUserRecord | null> {
    const res = await client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: pk(tenantId), sk: userSk(email) },
      }),
    );
    if (!res.Item) return null;
    return itemToTenantUser(res.Item);
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
    manufacturer: (item.manufacturer as string | null) ?? null,
    model: (item.model as string | null) ?? null,
    serialNumber: (item.serialNumber as string | null) ?? null,
    meterSize: (item.meterSize as string | null) ?? null,
    installDate: (item.installDate as string | null) ?? null,
    meterType: (item.meterType as string | null) ?? null,
    locationDetail: (item.locationDetail as string | null) ?? null,
    radioId: (item.radioId as string | null) ?? null,
    lastTestedAt: (item.lastTestedAt as string | null) ?? null,
    notes: (item.notes as string | null) ?? null,
    latitude: coerceStoredCoordinate(item.latitude),
    longitude: coerceStoredCoordinate(item.longitude),
    updatedAt: String(item.updatedAt ?? new Date().toISOString()),
  };
}

function coerceStoredCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
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

function itemToSourceReading(item: Record<string, unknown>): SourceReading | null {
  const mode = item.volumeMode;
  if (mode !== 'period' && mode !== 'cumulative') return null;
  return {
    tenantId: String(item.tenantId),
    sourceId: String(item.sourceId),
    sourceName: String(item.sourceName ?? item.sourceId),
    timestamp: String(item.timestamp),
    value: Number(item.value),
    volumeMode: mode as SourceVolumeMode,
    unit: String(item.unit ?? 'gal'),
    notes: (item.notes as string | null) ?? null,
  };
}

function itemToAlertStatus(item: Record<string, unknown>): AlertStatusRecord | null {
  const status = item.status;
  if (status !== 'acknowledged' && status !== 'dispatched' && status !== 'resolved') return null;
  return {
    tenantId: String(item.tenantId),
    alertId: String(item.alertId),
    status,
    actorUserId: String(item.actorUserId ?? ''),
    actorEmail: String(item.actorEmail ?? ''),
    updatedAt: String(item.updatedAt ?? new Date().toISOString()),
    note: typeof item.note === 'string' ? item.note : null,
    meterId: typeof item.meterId === 'string' ? item.meterId : null,
    summary: typeof item.summary === 'string' ? item.summary : null,
  };
}

function itemToAlertActivity(item: Record<string, unknown>): AlertActivityEvent | null {
  const action = item.action;
  const status = item.status;
  if (
    action !== 'acknowledge' &&
    action !== 'accept' &&
    action !== 'dispatch' &&
    action !== 'resolve'
  ) {
    return null;
  }
  if (status !== 'acknowledged' && status !== 'dispatched' && status !== 'resolved') return null;
  return {
    tenantId: String(item.tenantId),
    eventId: String(item.eventId ?? item.sk ?? ''),
    alertId: String(item.alertId),
    meterId: typeof item.meterId === 'string' ? item.meterId : null,
    action,
    status,
    actorUserId: String(item.actorUserId ?? ''),
    actorEmail: String(item.actorEmail ?? ''),
    note: typeof item.note === 'string' ? item.note : null,
    summary: typeof item.summary === 'string' ? item.summary : null,
    createdAt: String(item.createdAt ?? new Date().toISOString()),
  };
}

function itemToBalanceThresholds(item: Record<string, unknown>): BalanceThresholdConfig | null {
  const lossPct = Number(item.lossPct);
  const lossGalMin = Number(item.lossGalMin);
  const gainTolerancePct = Number(item.gainTolerancePct);
  const gainGalMin = Number(item.gainGalMin);
  if (![lossPct, lossGalMin, gainTolerancePct, gainGalMin].every(Number.isFinite)) {
    return null;
  }
  return {
    tenantId: String(item.tenantId),
    lossPct,
    lossGalMin,
    gainTolerancePct,
    gainGalMin,
    updatedAt: String(item.updatedAt ?? new Date().toISOString()),
    updatedByUserId: String(item.updatedByUserId ?? ''),
    updatedByEmail: String(item.updatedByEmail ?? ''),
  };
}

function itemToTenantProfile(item: Record<string, unknown>): TenantProfile | null {
  const tenantId = item.tenantId;
  const displayName = item.displayName;
  if (typeof tenantId !== 'string' || typeof displayName !== 'string') return null;

  const billingStatus: BillingStatus = isBillingStatus(item.billingStatus)
    ? item.billingStatus
    : 'pilot';
  const billingMode: BillingMode = isBillingMode(item.billingMode)
    ? item.billingMode
    : billingStatus === 'pilot'
      ? 'pilot'
      : 'manual';
  const planCode: PlanCode = isPlanCode(item.planCode) ? item.planCode : 'meters_0_100';

  const meterRaw = item.meterCountEstimate;
  const meterCountEstimate =
    typeof meterRaw === 'number' && Number.isFinite(meterRaw)
      ? Math.floor(meterRaw)
      : undefined;
  const retentionRaw = item.retentionMonths;
  const retentionMonths =
    typeof retentionRaw === 'number' && Number.isFinite(retentionRaw)
      ? Math.floor(retentionRaw)
      : undefined;

  const paymentProvider =
    item.paymentProvider === 'stripe' ||
    item.paymentProvider === 'square' ||
    item.paymentProvider === 'manual' ||
    item.paymentProvider === 'other'
      ? item.paymentProvider
      : 'none';

  return {
    tenantId,
    displayName,
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    createdByUserId: String(item.createdByUserId ?? ''),
    createdByEmail: String(item.createdByEmail ?? ''),
    initialUserEmail: String(item.initialUserEmail ?? ''),
    billingStatus,
    billingMode,
    planCode,
    meterCountEstimate,
    retentionMonths,
    billingContactEmail:
      typeof item.billingContactEmail === 'string' ? item.billingContactEmail : undefined,
    pilotExpiresAt: typeof item.pilotExpiresAt === 'string' ? item.pilotExpiresAt : undefined,
    lastPaymentAt: typeof item.lastPaymentAt === 'string' ? item.lastPaymentAt : undefined,
    billingNotes: typeof item.billingNotes === 'string' ? item.billingNotes : undefined,
    paymentProvider,
    mapTown: typeof item.mapTown === 'string' ? item.mapTown : null,
    mapCenterLat: coerceStoredCoordinate(item.mapCenterLat),
    mapCenterLng: coerceStoredCoordinate(item.mapCenterLng),
    mapZoom:
      typeof item.mapZoom === 'number' && Number.isFinite(item.mapZoom)
        ? Math.round(item.mapZoom)
        : item.mapZoom != null && item.mapZoom !== ''
          ? (() => {
              const z = Number(item.mapZoom);
              return Number.isFinite(z) ? Math.round(z) : null;
            })()
          : null,
  };
}

function itemToOnboardingIntake(item: Record<string, unknown>): OnboardingIntake | null {
  const tenantId = item.tenantId;
  if (typeof tenantId !== 'string') return null;
  const path = item.onboardingPath;
  const onboardingPath =
    path === 'A' || path === 'B' || path === 'C' || path === 'D' ? path : 'A';
  const unit = item.preferredUnit;
  const preferredUnit = unit === 'cf' ? 'cf' : 'gal';
  const sched = item.readSchedule;
  const readSchedule =
    sched === 'ami' || sched === 'mixed' ? sched : 'manual';
  const fmt = item.exportFormat;
  const exportFormat =
    fmt === 'csv' || fmt === 'xlsx' || fmt === 'both' ? fmt : 'unknown';
  const stepRaw = item.currentStep;
  const currentStep =
    typeof stepRaw === 'number' && Number.isFinite(stepRaw) ? Math.max(0, Math.floor(stepRaw)) : 0;

  return {
    tenantId,
    currentStep,
    completedAt: typeof item.completedAt === 'string' ? item.completedAt : null,
    systemName: typeof item.systemName === 'string' ? item.systemName : '',
    serviceTerritoryAddress:
      typeof item.serviceTerritoryAddress === 'string' ? item.serviceTerritoryAddress : '',
    mapTown: typeof item.mapTown === 'string' ? item.mapTown : '',
    primaryContactName: typeof item.primaryContactName === 'string' ? item.primaryContactName : '',
    primaryContactEmail:
      typeof item.primaryContactEmail === 'string' ? item.primaryContactEmail : '',
    primaryContactPhone:
      typeof item.primaryContactPhone === 'string' ? item.primaryContactPhone : '',
    billingClerkName: typeof item.billingClerkName === 'string' ? item.billingClerkName : '',
    billingClerkPhone: typeof item.billingClerkPhone === 'string' ? item.billingClerkPhone : '',
    meterCountEstimate:
      typeof item.meterCountEstimate === 'number' && Number.isFinite(item.meterCountEstimate)
        ? Math.floor(item.meterCountEstimate)
        : null,
    sourceCountEstimate:
      typeof item.sourceCountEstimate === 'number' && Number.isFinite(item.sourceCountEstimate)
        ? Math.floor(item.sourceCountEstimate)
        : null,
    readSchedule,
    preferredUnit,
    billingCycleNote: typeof item.billingCycleNote === 'string' ? item.billingCycleNote : '',
    municipalBillingSystem:
      typeof item.municipalBillingSystem === 'string' ? item.municipalBillingSystem : '',
    exportFormat,
    exportColumnHints: typeof item.exportColumnHints === 'string' ? item.exportColumnHints : '',
    onboardingPath,
    hasHistoricalExport: Boolean(item.hasHistoricalExport),
    historyNotes: typeof item.historyNotes === 'string' ? item.historyNotes : '',
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
  };
}

function itemToBillingEvent(item: Record<string, unknown>): BillingEvent | null {
  const tenantId = item.tenantId;
  const eventId = item.eventId;
  const createdAt = item.createdAt;
  const eventType = item.eventType;
  const source = item.source;
  const billingStatusAfter = item.billingStatusAfter;
  if (
    typeof tenantId !== 'string' ||
    typeof eventId !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof eventType !== 'string' ||
    typeof source !== 'string' ||
    !isBillingStatus(billingStatusAfter)
  ) {
    return null;
  }
  const amountRaw = item.amountCents;
  return {
    tenantId,
    eventId,
    createdAt,
    eventType: eventType as BillingEvent['eventType'],
    source: source as BillingEvent['source'],
    billingStatusAfter,
    amountCents:
      typeof amountRaw === 'number' && Number.isFinite(amountRaw) ? Math.round(amountRaw) : undefined,
    currency: typeof item.currency === 'string' ? item.currency : undefined,
    method: typeof item.method === 'string' ? (item.method as BillingEvent['method']) : undefined,
    actorUserId: String(item.actorUserId ?? ''),
    actorEmail: String(item.actorEmail ?? ''),
    note: typeof item.note === 'string' ? item.note : undefined,
    pilotExpiresAt: typeof item.pilotExpiresAt === 'string' ? item.pilotExpiresAt : undefined,
    externalEventId: typeof item.externalEventId === 'string' ? item.externalEventId : undefined,
  };
}

function itemToTenantUser(item: Record<string, unknown>): TenantUserRecord | null {
  const role = item.role;
  if (role !== 'operator' && role !== 'system_admin') return null;
  const email = item.email;
  const tenantId = item.tenantId;
  if (typeof email !== 'string' || typeof tenantId !== 'string') return null;
  return {
    tenantId,
    email,
    role: role as AssignableTenantRole,
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    createdByUserId: String(item.createdByUserId ?? ''),
    createdByEmail: String(item.createdByEmail ?? ''),
  };
}

function itemToConversation(item: Record<string, unknown>): ConversationMessage | null {
  const tenantId = item.tenantId;
  const userId = item.userId;
  const messageId = item.messageId;
  const role = item.role;
  const text = item.text;
  if (
    typeof tenantId !== 'string' ||
    typeof userId !== 'string' ||
    typeof messageId !== 'string' ||
    typeof text !== 'string' ||
    (role !== 'user' && role !== 'assistant')
  ) {
    return null;
  }
  return {
    tenantId,
    userId,
    messageId,
    role,
    text,
    createdAt: String(item.createdAt ?? new Date().toISOString()),
    model: typeof item.model === 'string' ? item.model : null,
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

export function createAlertStatusStoreFromEnv(): AlertStatusStore {
  const table = process.env.DATA_TABLE;
  if (!table) {
    throw new Error('DATA_TABLE env is not configured');
  }
  return new DynamoMeterStore(table);
}

export function createBalanceThresholdStoreFromEnv(): BalanceThresholdStore {
  const table = process.env.DATA_TABLE;
  if (!table) {
    throw new Error('DATA_TABLE env is not configured');
  }
  return new DynamoMeterStore(table);
}

export function createTenantStoreFromEnv(): TenantStore {
  const table = process.env.DATA_TABLE;
  if (!table) {
    throw new Error('DATA_TABLE env is not configured');
  }
  return new DynamoMeterStore(table);
}

export function createOnboardingStoreFromEnv(): OnboardingStore {
  const table = process.env.DATA_TABLE;
  if (!table) {
    throw new Error('DATA_TABLE env is not configured');
  }
  return new DynamoMeterStore(table);
}

export function createConversationStoreFromEnv(): ConversationStore {
  const table = process.env.DATA_TABLE;
  if (!table) {
    throw new Error('DATA_TABLE env is not configured');
  }
  return new DynamoMeterStore(table);
}
