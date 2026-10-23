"use server";

import { MongoServerError } from "mongodb";
import { revalidatePath } from "next/cache";
import { createRelease } from "@/controllers/updateController";

export interface ReleaseFormState {
    success: boolean;
    message: string;
}

export async function publishRelease(
    _previousState: ReleaseFormState,
    formData: FormData
): Promise<ReleaseFormState> {
    const version = String(formData.get("version") ?? "").trim();
    const updateUrl = String(formData.get("updateUrl") ?? "").trim();
    const forceUpdate = formData.get("forceUpdate") === "Y" ? "Y" : "N";
    const releaseNotes = String(formData.get("releaseNotes") ?? "").trim();

    if (!/^\d+(\.\d+){0,3}$/.test(version)) {
        return { success: false, message: "Version must look like 1.2.3" };
    }

    try {
        const url = new URL(updateUrl);

        if (url.protocol !== "https:" && url.protocol !== "http:") {
            throw new Error();
        }
    } catch {
        return { success: false, message: "Update URL must be a valid http(s) URL" };
    }

    try {
        await createRelease({ version, updateUrl, forceUpdate, releaseNotes });
    } catch (error: unknown) {
        if (error instanceof MongoServerError && error.code === 11000) {
            return { success: false, message: `Version ${version} already exists` };
        }

        return {
            success: false,
            message: error instanceof Error ? error.message : "Failed to publish release",
        };
    }

    revalidatePath("/admin/releases");

    return { success: true, message: `Version ${version} published` };
}
