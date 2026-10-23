export const ACCESS_TOKEN_TTL_SECONDS = 5 * 60;

function encodeBase64Url(bytes: Uint8Array): string {
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

export async function createAccessToken(clientId: string): Promise<string> {
    const secret = process.env.JWT_SECRET;

    if (!secret || new TextEncoder().encode(secret).byteLength < 32) {
        throw new Error("JWT_SECRET must be configured with at least 32 bytes");
    }

    const now = Math.floor(Date.now() / 1000);
    const encodedHeader = encodeBase64Url(
        new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    );
    const encodedPayload = encodeBase64Url(
        new TextEncoder().encode(
            JSON.stringify({
                sub: clientId,
                iat: now,
                exp: now + ACCESS_TOKEN_TTL_SECONDS,
            })
        )
    );
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(signingInput)
    );
    const signatureBytes = new Uint8Array(signature);
    return `${signingInput}.${encodeBase64Url(signatureBytes)}`;
}
