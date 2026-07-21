import * as Astronomy from "astronomy-engine";

export interface PanchamiDay {
    date: string;
    paksha: "Shukla" | "Krishna";
    tamilMonth: string;
    tithiStart: string;
    tithiEnd: string;
    fastDay: true;
    festivals: string;
}

const TAMIL_MONTHS = [
    "Chithirai", "Vaikasi", "Aani", "Aadi", "Avani", "Purattasi",
    "Ippasi", "Karthigai", "Margazhi", "Thai", "Maasi", "Panguni",
];

// Fixed cultural facts, not something to compute or guess - kept as a lookup table.
const FESTIVAL_MAP: Record<string, string> = {
    "Maasi-Shukla": "Vasant Panchami (Saraswati Puja)",
    "Purattasi-Shukla": "Rishi Panchami",
    "Avani-Krishna": "Krishna Janmashtami month Panchami",
    "Margazhi-Shukla": "Vivah Panchami",
    "Avani-Shukla": "Nag Panchami",
};

const CHENNAI = { lat: 13.0827, lon: 80.2707 };

function lahiriAyanamsa(date: Date): number {
    // Linear approximation of Lahiri ayanamsa (~23.85 deg at J2000, precessing ~50.29"/year).
    // Accurate enough to place a date into one of 12 thirty-degree Tamil month slots.
    const J2000 = new Date("2000-01-01T12:00:00Z");
    const yearsSinceJ2000 = (date.getTime() - J2000.getTime()) / (86400000 * 365.25);
    return 23.85 + yearsSinceJ2000 * (50.29 / 3600);
}

function tamilMonthFor(date: Date): string {
    const sun = Astronomy.SunPosition(Astronomy.MakeTime(date));
    const siderealLon = (sun.elon - lahiriAyanamsa(date) + 360) % 360;
    return TAMIL_MONTHS[Math.floor(siderealLon / 30) % 12];
}

function toIST(astroTime: Astronomy.AstroTime): Date {
    return new Date(astroTime.date.getTime() + 5.5 * 3600 * 1000);
}

function fmtIST(d: Date): string {
    const hh = d.getUTCHours();
    const mm = d.getUTCMinutes();
    const ampm = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function dateKeyIST(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function chennaiSunrise(dayIST: Date): Astronomy.AstroTime | null {
    const observer = new Astronomy.Observer(CHENNAI.lat, CHENNAI.lon, 0);
    const localMidnightUTC = new Date(
        Date.UTC(dayIST.getUTCFullYear(), dayIST.getUTCMonth(), dayIST.getUTCDate()) - 5.5 * 3600 * 1000
    );
    return Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, Astronomy.MakeTime(localMidnightUTC), 2);
}

/**
 * Finds every Panchami (5th tithi, both Shukla and Krishna paksha) between two dates.
 * The calendar date assigned to each Panchami follows tradition: whichever tithi is
 * prevailing at sunrise (Chennai reference) is the tithi observed that day.
 */
export function computePanchamiDays(startDate: Date, endDate: Date): PanchamiDay[] {
    const results: PanchamiDay[] = [];
    const targets: Array<{ elong: number; paksha: "Shukla" | "Krishna" }> = [
        { elong: 48, paksha: "Shukla" },
        { elong: 228, paksha: "Krishna" },
    ];

    let cursor = Astronomy.MakeTime(startDate);
    const endTime = Astronomy.MakeTime(endDate);

    while (cursor.date < endTime.date) {
        for (const t of targets) {
            const tithiStart = Astronomy.SearchMoonPhase(t.elong, cursor, 40);
            if (!tithiStart || tithiStart.date > endTime.date) continue;

            const tithiEnd = Astronomy.SearchMoonPhase((t.elong + 12) % 360, tithiStart, 3);
            if (!tithiEnd) continue;

            const istStart = toIST(tithiStart);
            const candidateDays = [istStart, new Date(istStart.getTime() + 86400000)];

            let assignedDate: string | null = null;
            for (const day of candidateDays) {
                const sunrise = chennaiSunrise(day);
                if (sunrise && sunrise.date >= tithiStart.date && sunrise.date < tithiEnd.date) {
                    assignedDate = dateKeyIST(day);
                    break;
                }
            }
            // Rare edge case: tithi is "skipped" (kshaya) and no sunrise falls within it.
            if (!assignedDate) {
                assignedDate = dateKeyIST(toIST(tithiEnd));
            }

            const tamilMonth = tamilMonthFor(tithiStart.date);
            const festivalKey = `${tamilMonth}-${t.paksha}`;

            results.push({
                date: assignedDate,
                paksha: t.paksha,
                tamilMonth,
                tithiStart: fmtIST(istStart),
                tithiEnd: fmtIST(toIST(tithiEnd)),
                fastDay: true,
                festivals: FESTIVAL_MAP[festivalKey] || `${tamilMonth} ${t.paksha} Panchami`,
            });
        }
        cursor = cursor.AddDays(13);
    }

    const seen = new Set<string>();
    const deduped = results.filter((r) => {
        const key = `${r.date}-${r.paksha}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    deduped.sort((a, b) => a.date.localeCompare(b.date));
    return deduped;
}
