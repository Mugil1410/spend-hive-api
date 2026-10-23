
import { NextRequest, NextResponse } from "next/server";
import { apiResponse } from "@/utils/apiResponse";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeBase64Url(value: string): Uint8Array | null {
    if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
        return null;
    }

    try {
        const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
        const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));

        return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch {
        return null;
    }
}

function decodeJsonSegment(value: string): Record<string, unknown> | null {
    const bytes = decodeBase64Url(value);

    if (!bytes) {
        return null;
    }

    try {
        const parsed: unknown = JSON.parse(
            new TextDecoder("utf-8", { fatal: true }).decode(bytes)
        );

        if (!isRecord(parsed)) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

export async function middleware(request: NextRequest) {
    if (request.nextUrl.pathname === "/api/get-access-token") {
        return NextResponse.next();
    }

    const secret = process.env.JWT_SECRET;

    if (!secret || new TextEncoder().encode(secret).length < 32) {
        return apiResponse(false, "JWT_SECRET must be configured with at least 32 bytes", 500);
    }

    const token = request.headers.get("token");

    if (!token) {
        return apiResponse(false, "unauthorized access", 401);
    }

    const segments = token.split(".");

    if (segments.length !== 3) {
        return apiResponse(false, "Invalid or expired token", 401);
    }

    const [encodedHeader, encodedPayload, encodedSignature] = segments;
    const header = decodeJsonSegment(encodedHeader);
    const payload = decodeJsonSegment(encodedPayload);
    const signature = decodeBase64Url(encodedSignature);

    if (
        !header ||
        header.alg !== "HS256" ||
        !payload ||
        !signature ||
        typeof payload.sub !== "string" ||
        payload.sub.length === 0 ||
        typeof payload.iat !== "number" ||
        !Number.isFinite(payload.iat) ||
        typeof payload.exp !== "number" ||
        !Number.isFinite(payload.exp)
    ) {
        return apiResponse(false, "Invalid or expired token", 401);
    }

    const now = Math.floor(Date.now() / 1000);

    if (
        payload.iat > now ||
        payload.exp <= now ||
        payload.exp <= payload.iat ||
        payload.exp - payload.iat > 5 * 60 ||
        (payload.nbf !== undefined &&
            (typeof payload.nbf !== "number" ||
                !Number.isFinite(payload.nbf) ||
                payload.nbf > now))
    ) {
        return apiResponse(false, "Invalid or expired token", 401);
    }

    try {
        const signatureBuffer = new ArrayBuffer(signature.byteLength);
        new Uint8Array(signatureBuffer).set(signature);
        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify"]
        );
        const isValid = await crypto.subtle.verify(
            "HMAC",
            key,
            signatureBuffer,
            new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
        );

        if (!isValid) {
            return apiResponse(false, "Invalid or expired token", 401);
        }
    } catch {
        return apiResponse(false, "Unable to validate token", 500);
    }

    return NextResponse.next();
}

export const config = {
    matcher: "/api/:path*",
};