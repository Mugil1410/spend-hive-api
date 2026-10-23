import { apiResponse } from "@/utils/apiResponse";
import { createAccessToken } from "@/utils/jwt";

export async function POST(request: Request) {
    const clientId = request.headers.get("client-id")?.trim();

    if (!clientId || clientId.length > 256) {
        return apiResponse(false, "A valid client-id header is required", 400);
    }

    try {
        const token = await createAccessToken(clientId);

        return apiResponse(true, "Access token created successfully", 200, {
            token
        });
    } catch (error: unknown) {
        return apiResponse(
            false,
            "Failed to create access token",
            500,
            undefined,
            error
        );
    }
}
