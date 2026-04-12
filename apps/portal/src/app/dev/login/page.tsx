"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import DevLoginClient from "./DevLoginClient";

function Inner() {
    const sp = useSearchParams();

    const enabled = process.env.NEXT_PUBLIC_DEV_LOGIN === "1";
    const expected = process.env.NEXT_PUBLIC_DEV_LOGIN_KEY || "";
    const key = sp.get("key") || "";

    const reason = useMemo(() => {
        if (!enabled) return "DEV_LOGIN disabled (NEXT_PUBLIC_DEV_LOGIN != 1)";
        if (!expected) return "Missing NEXT_PUBLIC_DEV_LOGIN_KEY at build time";
        if (!key) return "Missing ?key= in URL";
        if (key !== expected) return "Wrong key";
        return "OK";
    }, [enabled, expected, key]);

    if (reason !== "OK") {
        return (
            <main style={{ padding: 24, fontFamily: "system-ui" }}>
                <h1>Dev Login Locked</h1>
                <p>{reason}</p>
                <p style={{ opacity: 0.7 }}>
                    expected: {expected ? "[set]" : "[empty]"} / got: {key || "[empty]"}
                </p>
            </main>
        );
    }

    return <DevLoginClient />;
}

export default function DevLoginPage() {
    return (
        <Suspense fallback={null}>
            <Inner />
        </Suspense>
    );
}
