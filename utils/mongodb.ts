import { Db, MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as {
    mongoClientPromise?: Promise<MongoClient>;
};

function getClientPromise(): Promise<MongoClient> {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI must be configured");
    }

    // Reuse one client across hot reloads and serverless invocations
    if (!globalForMongo.mongoClientPromise) {
        globalForMongo.mongoClientPromise = new MongoClient(uri).connect();
    }

    return globalForMongo.mongoClientPromise;
}

export async function getDb(): Promise<Db> {
    const client = await getClientPromise();

    return client.db(process.env.MONGODB_DB || "spendhive");
}
