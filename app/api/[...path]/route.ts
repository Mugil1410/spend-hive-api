
import { apiResponse } from "@/utils/apiResponse";

function handleNotFound() {
    return apiResponse(false, "API endpoint not found", 404);
}

export async function GET() {
    return handleNotFound();
}

export async function POST() {
    return handleNotFound();
}

export async function PUT() {
    return handleNotFound();
}

export async function PATCH() {
    return handleNotFound();
}

export async function DELETE() {
    return handleNotFound();
}