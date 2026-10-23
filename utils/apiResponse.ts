
import { NextResponse } from "next/server";

export function apiResponse(
    success: boolean,
    message: string,
    statusCode: number,
    data?: unknown,
    error?: unknown
) {
    const response: {
        success: boolean;
        message: string;
        data?: unknown;
        error?: string;
    } = {
        success,
        message,
    };

    if (success) {
        response.data = data ?? null;
    } else if (error !== undefined) {
        response.error =
            error instanceof Error
                ? error.message
                : String(error);
    }

    return NextResponse.json(response, { status: statusCode });
}