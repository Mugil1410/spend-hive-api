import { uploadCloudBackup } from "@/controllers/cloudBackupController";
import { handleCloudBackupRequest } from "@/utils/cloudBackupRequest";

export async function POST(request: Request) {
    return handleCloudBackupRequest(
        request,
        "Backup uploaded successfully",
        "Failed to upload backup",
        ({ owner, deviceId, authKey, body }) =>
            uploadCloudBackup({
                owner,
                deviceId,
                authKey,
                payload: body.payload,
                deviceName: body.deviceName,
                appVersion: body.appVersion,
                replaceId: body.replaceId,
            })
    );
}
