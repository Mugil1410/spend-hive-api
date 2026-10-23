import { listCloudBackups } from "@/controllers/cloudBackupController";
import { handleCloudBackupRequest } from "@/utils/cloudBackupRequest";

export async function POST(request: Request) {
    return handleCloudBackupRequest(
        request,
        "Backups fetched successfully",
        "Failed to fetch backups",
        async ({ owner, authKey }) => ({ backups: await listCloudBackups(owner, authKey) })
    );
}
