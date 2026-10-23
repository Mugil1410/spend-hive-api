import { apiResponse } from "@/utils/apiResponse";
import {
    BackupOwner,
    CloudBackupError,
    resolveOwner,
    validateAuthKey,
    validateDeviceId,
} from "@/controllers/cloudBackupController";

export interface CloudBackupBody {
    owner: BackupOwner;
    deviceId: string;
    authKey: string;
    body: Record<string, unknown>;
}

/** Parses the JSON body, validates deviceId, optional email and authKey, runs the handler and maps errors to API responses. */
export async function handleCloudBackupRequest(
    request: Request,
    successMessage: string,
    failureMessage: string,
    handler: (input: CloudBackupBody) => Promise<unknown>
) {
    let body: Record<string, unknown>;

    try {
        const parsed: unknown = await request.json();

        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            throw new Error();
        }

        body = parsed as Record<string, unknown>;
    } catch {
        return apiResponse(false, "Request body must be a JSON object", 400);
    }

    try {
        const deviceId = validateDeviceId(body.deviceId);
        const owner = resolveOwner(body.email, deviceId);
        const authKey = validateAuthKey(body.authKey);
        const data = await handler({ owner, deviceId, authKey, body });

        return apiResponse(true, successMessage, 200, data);
    } catch (error: unknown) {
        if (error instanceof CloudBackupError) {
            return apiResponse(false, error.message, error.statusCode);
        }

        return apiResponse(false, failureMessage, 500, undefined, error);
    }
}
