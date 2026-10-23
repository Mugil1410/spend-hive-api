import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/utils/mongodb";

const scryptAsync = promisify(scrypt) as (
    password: string,
    salt: Buffer,
    keylen: number
) => Promise<Buffer>;

export const MAX_BACKUPS_PER_OWNER = 3;
// Vercel caps request bodies at 4.5 MB, so keep the stored backup comfortably below that.
export const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

export class CloudBackupError extends Error {
    constructor(message: string, public statusCode: number) {
        super(message);
    }
}

export interface CloudBackupSummary {
    id: string;
    createdAt: Date;
    sizeBytes: number;
    deviceName: string;
    appVersion: string;
}

/**
 * Who a set of backups belongs to: "device:<id>" by default, or "email:<address>" when the user
 * gave an email so the backups can be restored on another phone.
 */
export type BackupOwner = string;

interface AccountDocument {
    owner: BackupOwner;
    // scrypt(authKey) - the app sends a key derived from owner + backup password, never the password itself.
    authSalt: string;
    authHash: string;
    failedAttempts: number;
    lockedUntil: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

interface BackupDocument {
    owner: BackupOwner;
    // The device that uploaded it, kept for every backup (including email ones).
    deviceId: string;
    // The password-encrypted backup container exactly as the app produced it; the server cannot read it.
    payload: string;
    sizeBytes: number;
    deviceName: string;
    appVersion: string;
    createdAt: Date;
}

let indexesReady: Promise<unknown> | undefined;

async function getCollections(): Promise<{
    accounts: Collection<AccountDocument>;
    backups: Collection<BackupDocument>;
}> {
    const db = await getDb();
    const accounts = db.collection<AccountDocument>("cloud_backup_accounts");
    const backups = db.collection<BackupDocument>("cloud_backups");

    indexesReady ??= Promise.all([
        accounts.createIndex({ owner: 1 }, { unique: true }),
        backups.createIndex({ owner: 1, createdAt: -1 }),
    ]).catch((error) => {
        indexesReady = undefined;
        throw error;
    });
    await indexesReady;

    return { accounts, backups };
}

export function validateDeviceId(value: unknown): string {
    const deviceId = typeof value === "string" ? value.trim() : "";

    if (deviceId.length === 0 || deviceId.length > 256) {
        throw new CloudBackupError("A valid deviceId is required", 400);
    }

    return deviceId;
}

/** Backups belong to the email when one is given, otherwise to the device. */
export function resolveOwner(email: unknown, deviceId: string): BackupOwner {
    if (email === undefined || email === null || email === "") {
        return `device:${deviceId}`;
    }

    const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        throw new CloudBackupError("A valid email address is required", 400);
    }

    return `email:${normalized}`;
}

function ownerLabel(owner: BackupOwner): string {
    return owner.startsWith("email:") ? "this email" : "this device";
}

export function validateAuthKey(value: unknown): string {
    if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
        throw new CloudBackupError("A valid authKey is required", 400);
    }

    return value;
}

async function hashAuthKey(authKey: string, salt: Buffer): Promise<Buffer> {
    return scryptAsync(authKey, salt, 32);
}

/**
 * Checks owner + authKey. The first upload for an owner registers its authKey, so later requests
 * must come with the same backup password (and, for email owners, the same email on any device).
 */
async function authenticate(
    accounts: Collection<AccountDocument>,
    owner: BackupOwner,
    authKey: string,
    allowRegister: boolean
): Promise<void> {
    const account = await accounts.findOne({ owner });
    const now = new Date();

    if (!account) {
        if (!allowRegister) {
            throw new CloudBackupError(`No cloud backups found for ${ownerLabel(owner)}`, 404);
        }

        const salt = randomBytes(16);
        const hash = await hashAuthKey(authKey, salt);

        await accounts.insertOne({
            owner,
            authSalt: salt.toString("hex"),
            authHash: hash.toString("hex"),
            failedAttempts: 0,
            lockedUntil: null,
            createdAt: now,
            updatedAt: now,
        });
        return;
    }

    if (account.lockedUntil && account.lockedUntil > now) {
        throw new CloudBackupError(
            "Too many incorrect attempts. Try again in a few minutes.",
            429
        );
    }

    const hash = await hashAuthKey(authKey, Buffer.from(account.authSalt, "hex"));

    if (!timingSafeEqual(hash, Buffer.from(account.authHash, "hex"))) {
        const failedAttempts = account.failedAttempts + 1;
        const locked = failedAttempts >= MAX_FAILED_ATTEMPTS;

        await accounts.updateOne(
            { owner },
            {
                $set: {
                    failedAttempts: locked ? 0 : failedAttempts,
                    lockedUntil: locked ? new Date(now.getTime() + LOCKOUT_MS) : null,
                    updatedAt: now,
                },
            }
        );
        throw new CloudBackupError(
            `Incorrect backup password for ${ownerLabel(owner)}. All cloud backups for ${ownerLabel(owner)} use the same password.`,
            401
        );
    }

    if (account.failedAttempts > 0 || account.lockedUntil) {
        await accounts.updateOne(
            { owner },
            { $set: { failedAttempts: 0, lockedUntil: null, updatedAt: now } }
        );
    }
}

function parseBackupId(value: unknown): ObjectId {
    if (typeof value !== "string" || !ObjectId.isValid(value)) {
        throw new CloudBackupError("A valid backup id is required", 400);
    }

    return new ObjectId(value);
}

function toSummary({ _id, payload: _payload, owner: _owner, deviceId: _deviceId, ...backup }: BackupDocument & { _id: ObjectId }): CloudBackupSummary {
    return { id: _id.toHexString(), ...backup };
}

function shortText(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() ? value.trim().slice(0, 100) : fallback;
}

export async function listCloudBackups(owner: BackupOwner, authKey: string): Promise<CloudBackupSummary[]> {
    const { accounts, backups } = await getCollections();

    await authenticate(accounts, owner, authKey, false);

    const list = await backups
        .find({ owner }, { projection: { payload: 0 } })
        .sort({ createdAt: -1 })
        .toArray();

    return list.map((backup) => toSummary(backup as BackupDocument & { _id: ObjectId }));
}

export async function uploadCloudBackup(input: {
    owner: BackupOwner;
    deviceId: string;
    authKey: string;
    payload: unknown;
    deviceName: unknown;
    appVersion: unknown;
    replaceId?: unknown;
}): Promise<{ backup: CloudBackupSummary; backups: CloudBackupSummary[] }> {
    if (typeof input.payload !== "string" || input.payload.length === 0) {
        throw new CloudBackupError("Backup payload is required", 400);
    }

    let container: unknown;

    try {
        container = JSON.parse(input.payload);
    } catch {
        throw new CloudBackupError("Backup payload must be JSON", 400);
    }

    // Only ever store encrypted backups.
    if (
        typeof container !== "object" ||
        container === null ||
        (container as { container?: unknown }).container !== "spendhive-encrypted-backup"
    ) {
        throw new CloudBackupError("Only encrypted SpendHive backups can be uploaded", 400);
    }

    const sizeBytes = Buffer.byteLength(input.payload, "utf8");

    if (sizeBytes > MAX_BACKUP_BYTES) {
        throw new CloudBackupError("Backup is too large for cloud storage (max 4 MB)", 413);
    }

    const { accounts, backups } = await getCollections();

    await authenticate(accounts, input.owner, input.authKey, true);

    if (input.replaceId !== undefined && input.replaceId !== null) {
        const replaceId = parseBackupId(input.replaceId);
        const removed = await backups.deleteOne({ _id: replaceId, owner: input.owner });

        if (removed.deletedCount === 0) {
            throw new CloudBackupError("The backup to replace was not found", 404);
        }
    }

    const count = await backups.countDocuments({ owner: input.owner });

    if (count >= MAX_BACKUPS_PER_OWNER) {
        throw new CloudBackupError(
            `You can keep up to ${MAX_BACKUPS_PER_OWNER} cloud backups. Replace or delete one first.`,
            409
        );
    }

    const document: BackupDocument = {
        owner: input.owner,
        deviceId: input.deviceId,
        payload: input.payload,
        sizeBytes,
        deviceName: shortText(input.deviceName, "Unknown device"),
        appVersion: shortText(input.appVersion, "unknown"),
        createdAt: new Date(),
    };
    const result = await backups.insertOne(document);

    return {
        backup: toSummary({ ...document, _id: result.insertedId }),
        backups: await listCloudBackups(input.owner, input.authKey),
    };
}

export async function downloadCloudBackup(
    owner: BackupOwner,
    authKey: string,
    id: unknown
): Promise<{ backup: CloudBackupSummary; payload: string }> {
    const backupId = parseBackupId(id);
    const { accounts, backups } = await getCollections();

    await authenticate(accounts, owner, authKey, false);

    const backup = await backups.findOne({ _id: backupId, owner });

    if (!backup) {
        throw new CloudBackupError("Backup not found", 404);
    }

    return { backup: toSummary(backup), payload: backup.payload };
}

export async function deleteCloudBackup(
    owner: BackupOwner,
    authKey: string,
    id: unknown
): Promise<CloudBackupSummary[]> {
    const backupId = parseBackupId(id);
    const { accounts, backups } = await getCollections();

    await authenticate(accounts, owner, authKey, false);

    const removed = await backups.deleteOne({ _id: backupId, owner });

    if (removed.deletedCount === 0) {
        throw new CloudBackupError("Backup not found", 404);
    }

    const remaining = await listCloudBackups(owner, authKey);

    // With nothing left, forget the password too so the next backup can choose a new one.
    if (remaining.length === 0) {
        await accounts.deleteOne({ owner });
    }

    return remaining;
}
