
import { getUpdateInfo } from "@/controllers/updateController";
import { apiResponse } from "@/utils/apiResponse";

export async function POST() {
    try {
        const updateInfo = await getUpdateInfo();

        return apiResponse(
            true,
            "Update information fetched successfully",
            200,
            updateInfo
        );
    } catch (error: unknown) {
        return apiResponse(
            false,
            "Failed to fetch update information",
            500,
            undefined,
            error
        );
    }
}