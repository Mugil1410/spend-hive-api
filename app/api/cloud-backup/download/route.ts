import { downloadCloudBackup } from "@/controllers/cloudBackupController";
import { handleCloudBackupRequest } from "@/utils/cloudBackupRequest";

export async function POST(request: Request) {
    return handleCloudBackupRequest(
        request,
        "Backup fetched successfully",
        "Failed to fetch backup",
        ({ owner, authKey, body }) => downloadCloudBackup(owner, authKey, body.id)
    );
}
