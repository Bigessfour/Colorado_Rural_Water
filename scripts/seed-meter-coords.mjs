#!/usr/bin/env node
/**
 * Feature 011 — seed Colorado meter pins for the demo tenant.
 *
 * Usage:
 *   API_BASE=https://….execute-api.us-east-1.amazonaws.com \
 *   BEARER_TOKEN=eyJ… \   # Cognito IdToken (must include custom:tenant_id)
 *   node scripts/seed-meter-coords.mjs
 *
 * Optional:
 *   BULK_FILL=1 — pin every meter still missing coords with a small deterministic
 *   jitter around Wiley (demo only; keep meter 1099 unmapped).
 *
 * AccessToken will 403 (missing tenant claim). Use IdToken.
 */
const apiBase = (
  process.env.API_BASE ||
  process.env.API_BASE_URL ||
  ""
).replace(/\/$/, "");
const token = process.env.BEARER_TOKEN || process.env.TOKEN || "";
const createMissing = process.env.CREATE_MISSING === "1";

if (!apiBase || !token) {
  console.error("Set API_BASE and BEARER_TOKEN (Cognito access token).");
  process.exit(1);
}

/** Approx Wiley / SE Colorado pins — demo only, not surveyed. */
const SEED = [
  {
    meterId: "1042",
    serviceAddress: "112 N Main St Wiley CO",
    latitude: 38.1542,
    longitude: -102.7201,
  },
  {
    meterId: "1043",
    serviceAddress: "220 E 3rd Ave Wiley CO",
    latitude: 38.1561,
    longitude: -102.7178,
  },
  {
    meterId: "1044",
    serviceAddress: "15 County Rd HH Wiley CO",
    latitude: 38.1489,
    longitude: -102.7312,
  },
  {
    meterId: "1045",
    serviceAddress: "88 S Colorado Ave Wiley CO",
    latitude: 38.1515,
    longitude: -102.7225,
  },
  {
    meterId: "1046",
    serviceAddress: "401 N Ward St Wiley CO",
    latitude: 38.1598,
    longitude: -102.7154,
  },
  {
    meterId: "1099",
    serviceAddress: "Unmapped staging lot Wiley CO",
    latitude: null,
    longitude: null,
  },
];

async function api(method, path, body) {
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  const listed = await api("GET", "/meters");
  if (!listed.ok) {
    console.error("GET /meters failed", listed.status, listed.json);
    process.exit(1);
  }
  const existing = new Set((listed.json.meters || []).map((m) => m.meterId));
  console.log(`Tenant meters on file: ${existing.size}`);

  for (const row of SEED) {
    if (!existing.has(row.meterId)) {
      if (!createMissing) {
        console.log(
          `skip ${row.meterId} (not on file — set CREATE_MISSING=1 to POST)`,
        );
        continue;
      }
      const created = await api("POST", "/meters", {
        meterId: row.meterId,
        serviceAddress: row.serviceAddress,
        latitude: row.latitude,
        longitude: row.longitude,
      });
      console.log(
        created.ok
          ? `created ${row.meterId}`
          : `create fail ${row.meterId} ${created.status} ${JSON.stringify(created.json)}`,
      );
      continue;
    }

    const updated = await api(
      "PUT",
      `/meters/${encodeURIComponent(row.meterId)}`,
      {
        latitude: row.latitude,
        longitude: row.longitude,
      },
    );
    console.log(
      updated.ok
        ? `updated ${row.meterId} → ${row.latitude ?? "null"}, ${row.longitude ?? "null"}`
        : `update fail ${row.meterId} ${updated.status} ${JSON.stringify(updated.json)}`,
    );
  }

  if (process.env.BULK_FILL === "1") {
    const center = { lat: 38.1542, lng: -102.7199 };
    const { createHash } = await import("node:crypto");
    const listedAgain = await api("GET", "/meters");
    const meters = listedAgain.json.meters || [];
    let pinned = 0;
    for (const m of meters) {
      if (m.meterId === "1099") continue;
      if (m.latitude != null && m.longitude != null) continue;
      const h = createHash("sha256").update(m.meterId).digest();
      const lat = +(center.lat + ((h[0] / 255) - 0.5) * 0.07).toFixed(6);
      const lng = +(center.lng + ((h[1] / 255) - 0.5) * 0.07).toFixed(6);
      const updated = await api("PUT", `/meters/${encodeURIComponent(m.meterId)}`, {
        latitude: lat,
        longitude: lng,
      });
      if (updated.ok) pinned += 1;
      else console.log(`bulk fail ${m.meterId}`, updated.status, updated.json);
    }
    console.log(`BULK_FILL pinned ${pinned} meters near Wiley (demo jitter)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
