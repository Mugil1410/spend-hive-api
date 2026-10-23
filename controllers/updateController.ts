import { Collection } from "mongodb";
import { getDb } from "@/utils/mongodb";

interface UpdateInfo {
    currentVersion: string;
    updateUrl: string;
    forceUpdate: "Y" | "N";
}

export interface Release {
    id: string;
    version: string;
    updateUrl: string;
    forceUpdate: "Y" | "N";
    releaseNotes: string;
    createdAt: Date;
}

interface ReleaseDocument {
    version: string;
    updateUrl: string;
    forceUpdate: "Y" | "N";
    releaseNotes: string;
    createdAt: Date;
}

let indexesReady: Promise<string> | undefined;

async function getReleasesCollection(): Promise<Collection<ReleaseDocument>> {
    const collection = (await getDb()).collection<ReleaseDocument>("releases");

    indexesReady ??= collection.createIndex({ version: 1 }, { unique: true });
    await indexesReady;

    return collection;
}

export async function getUpdateInfo(): Promise<UpdateInfo | null> {
    const collection = await getReleasesCollection();
    const latest = await collection.findOne({}, { sort: { createdAt: -1 } });

    if (!latest) {
        return null;
    }

    return {
        currentVersion: latest.version,
        updateUrl: latest.updateUrl,
        forceUpdate: latest.forceUpdate,
    };
}

export async function listReleases(): Promise<Release[]> {
    const collection = await getReleasesCollection();
    const releases = await collection.find().sort({ createdAt: -1 }).toArray();

    return releases.map(({ _id, ...release }) => ({
        id: _id.toHexString(),
        ...release,
    }));
}

export async function createRelease(
    release: Omit<ReleaseDocument, "createdAt">
): Promise<void> {
    const collection = await getReleasesCollection();

    await collection.insertOne({ ...release, createdAt: new Date() });
}
