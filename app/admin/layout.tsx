import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
    title: "SpendHive Admin",
};

const styles = `
    :root { color-scheme: light dark; --border: #8884; --muted: #888; --accent: #2563eb; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; line-height: 1.5; }
    main { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
    h1 { margin-top: 0; }
    section { border: 1px solid var(--border); border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    form { display: grid; gap: 12px; }
    label { display: grid; gap: 4px; font-weight: 600; font-size: 14px; }
    input, textarea, select { font: inherit; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: transparent; color: inherit; }
    button { font: inherit; padding: 8px 16px; border: 0; border-radius: 6px; background: var(--accent); color: #fff; cursor: pointer; justify-self: start; }
    button:disabled { opacity: 0.6; }
    .error { color: #dc2626; }
    .success { color: #16a34a; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
    td.url { word-break: break-all; }
    .badge { display: inline-block; padding: 0 8px; border-radius: 999px; font-size: 12px; border: 1px solid var(--border); }
    .muted { color: var(--muted); }
`;

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body>
                <style>{styles}</style>
                <main>{children}</main>
            </body>
        </html>
    );
}
