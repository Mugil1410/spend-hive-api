import { connection } from "next/server";
import { Suspense } from "react";
import { listReleases } from "@/controllers/updateController";
import { ReleaseForm } from "./ReleaseForm";

async function ReleaseList() {
    await connection();
    const releases = await listReleases();

    if (releases.length === 0) {
        return <p className="muted">No releases yet. Publish the first one above.</p>;
    }

    return (
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Version</th>
                        <th>Force</th>
                        <th>Update URL</th>
                        <th>Notes</th>
                        <th>Released</th>
                    </tr>
                </thead>
                <tbody>
                    {releases.map((release, index) => (
                        <tr key={release.id}>
                            <td>
                                {release.version}{" "}
                                {index === 0 && <span className="badge">current</span>}
                            </td>
                            <td>{release.forceUpdate === "Y" ? "Yes" : "No"}</td>
                            <td className="url">{release.updateUrl}</td>
                            <td>{release.releaseNotes || <span className="muted">-</span>}</td>
                            <td>{release.createdAt.toLocaleString("en-IN")}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function ReleasesPage() {
    return (
        <>
            <h1>App releases</h1>
            <section>
                <h2>Publish new release</h2>
                <p className="muted">
                    The newest release is what <code>/api/check-version</code> returns.
                </p>
                <ReleaseForm />
            </section>
            <section>
                <h2>All releases</h2>
                <Suspense fallback={<p className="muted">Loading releases...</p>}>
                    <ReleaseList />
                </Suspense>
            </section>
        </>
    );
}
