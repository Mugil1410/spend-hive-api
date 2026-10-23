import { deleteCloudBackup } from "@/controllers/cloudBackupController";
import { handleCloudBackupRequest } from "@/utils/cloudBackupRequest";

export async function POST(request: Request) {
    return handleCloudBackupRequest(
        request,
        "Backup deleted successfully",
        "Failed to delete backup",
        async ({ owner, authKey, body }) => ({ backups: await deleteCloudBackup(owner, authKey, body.id) })
    );
}
