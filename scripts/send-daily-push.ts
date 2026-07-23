import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { computePanchamiDays } from "../src/server/panchamiCalc";

async function main() {
    const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
    );

    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || "mailto:example@example.com",
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
    );

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split("T")[0];

    const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
    const days = computePanchamiDays(start, end);

    const today = days.find((d) => d.date === todayStr);
    const tomorrow = days.find((d) => d.date === tomorrowStr);

    let payload: { title: string; body: string; url: string } | null = null;
    if (today) {
        payload = {
            title: "🌸 Today is Panchami - Fasting Day!",
            body: `${today.paksha} Paksha, ${today.tamilMonth} Month. Keep your vow strictly vegetarian today.`,
            url: "/",
        };
    } else if (tomorrow) {
        payload = {
            title: "⚠️ Panchami Fast Tomorrow",
            body: `${tomorrow.paksha} Paksha, ${tomorrow.tamilMonth} Month. Prepare tonight.`,
            url: "/",
        };
    }

    if (!payload) {
        console.log("No Panchami today or tomorrow - no push sent.");
        return;
    }

    const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
    if (error) throw error;

    console.log(`Sending to ${subs.length} subscribed device(s)...`);

    for (const sub of subs) {
        const subscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        try {
            await webpush.sendNotification(subscription, JSON.stringify(payload));
            console.log("Sent to:", sub.endpoint.slice(0, 50), "...");
        } catch (err: any) {
            console.error("Failed for", sub.endpoint.slice(0, 50), "-", err.statusCode);
            // 410 Gone / 404 = subscription expired or revoked - clean it up automatically
            if (err.statusCode === 410 || err.statusCode === 404) {
                await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                console.log("Removed stale subscription:", sub.id);
            }
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
