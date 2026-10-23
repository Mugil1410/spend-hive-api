"use client";

import { useActionState } from "react";
import { publishRelease, type ReleaseFormState } from "./actions";

const initialState: ReleaseFormState = { success: false, message: "" };

export function ReleaseForm() {
    const [state, formAction, pending] = useActionState(publishRelease, initialState);

    return (
        <form action={formAction}>
            <label>
                Version
                <input name="version" placeholder="1.1.46" required />
            </label>
            <label>
                Update URL
                <input
                    name="updateUrl"
                    type="url"
                    placeholder="https://spend-hive-api.vercel.app/apk/spendhive.apk"
                    required
                />
            </label>
            <label>
                Force update
                <select name="forceUpdate" defaultValue="N">
                    <option value="N">No (optional update)</option>
                    <option value="Y">Yes (force update)</option>
                </select>
            </label>
            <label>
                Release notes
                <textarea name="releaseNotes" rows={3} placeholder="Optional" />
            </label>
            <button type="submit" disabled={pending}>
                {pending ? "Publishing..." : "Publish release"}
            </button>
            {state.message && (
                <p className={state.success ? "success" : "error"}>{state.message}</p>
            )}
        </form>
    );
}
