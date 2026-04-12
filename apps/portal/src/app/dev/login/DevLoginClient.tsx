"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function DevLoginClient() {
    const [token, setToken] = useState<string>("");
    const [userEmail, setUserEmail] = useState<string>("");
    const [error, setError] = useState<string>("");

    useEffect(() => {
        const handleRedirectResult = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    const idToken = await result.user.getIdToken(true);
                    setToken(idToken);
                    setUserEmail(result.user.email ?? "");
                    if (process.env.NODE_ENV !== "production") {
                        console.log("[DEV_LOGIN] Firebase ID Token:", idToken);
                    }
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : "Login failed");
            }
        };

        handleRedirectResult();
    }, []);

    const doLogin = async () => {
        setError("");
        try {
            const provider = new GoogleAuthProvider();
            await signInWithRedirect(auth, provider);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Login failed");
        }
    };

    const doLogout = async () => {
        setError("");
        await signOut(auth);
        setToken("");
        setUserEmail("");
    };

    if (process.env.NODE_ENV === "production") {
        return (
            <main style={{ padding: 24, fontFamily: "system-ui" }}>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dev Login</h1>
                <p style={{ opacity: 0.8 }}>
                    Dev login ถูกปิดใน production
                </p>
            </main>
        );
    }

    return (
        <main style={{ padding: 24, fontFamily: "system-ui" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dev Login (E2E Token)</h1>
            <p style={{ opacity: 0.8 }}>
                ใช้หน้านี้เพื่อดึง Firebase ID Token เท่านั้น แล้วปิด feature นี้หลังทดสอบ
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button onClick={doLogin} style={{ padding: "10px 14px", fontWeight: 600 }}>
                    Sign in with Google
                </button>
                <button onClick={doLogout} style={{ padding: "10px 14px" }}>
                    Sign out
                </button>
            </div>
            <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                หลังล็อกอิน ระบบจะพากลับมาหน้านี้อัตโนมัติ
            </p>

            {error ? (
                <p style={{ marginTop: 12, color: "#b00020" }}>{error}</p>
            ) : null}

            {userEmail ? (
                <p style={{ marginTop: 16 }}>
                    Signed in as: <b>{userEmail}</b>
                </p>
            ) : null}

            <h2 style={{ marginTop: 20, fontSize: 16 }}>Firebase ID Token</h2>
            <textarea
                value={token}
                readOnly
                rows={10}
                style={{ width: "100%", marginTop: 8, padding: 12 }}
                placeholder="Login แล้ว token จะขึ้นตรงนี้"
            />

            <p style={{ marginTop: 10, opacity: 0.8 }}>
                ใช้ token นี้ไปใส่ Authorization: Bearer ... หรือ export เป็น ID_TOKEN
            </p>
        </main>
    );
}
