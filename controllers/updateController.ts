interface UpdateInfo {
    currentVersion: string;
    updateUrl: string;
    forceUpdate: "Y" | "N";
}

export async function getUpdateInfo(): Promise<UpdateInfo> {
    
    return {
        currentVersion: "1.0.0",
        updateUrl: "https://example.com/app-update.apk",
        forceUpdate: "N",
    };
}