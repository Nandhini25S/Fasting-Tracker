interface Hotel {
    name: string;
    distanceHint: string;
    dishes: string[];
    reason: string;
}

const GENERIC_SATVIK_DISHES = [
    "Steamed idli or dosa with sambar (no onion/garlic on request)",
    "Curd rice or lemon rice",
    "Vegetable khichdi or plain dal-rice",
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findNearbyVegHotels(lat: number, lon: number): Promise<Hotel[]> {
    const radius = 5000;
    const query = `
    [out:json][timeout:20];
    (
      node["amenity"="restaurant"]["diet:vegetarian"~"only|yes"](around:${radius},${lat},${lon});
      node["amenity"="restaurant"]["cuisine"~"vegetarian|indian"](around:${radius},${lat},${lon});
    );
    out body 15;
  `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
    });
    if (!res.ok) throw new Error(`Overpass request failed: ${res.status}`);
    const data = await res.json();

    const named = (data.elements || []).filter((el: any) => el.tags?.name);

    const withDistance = named.map((el: any) => ({
        name: el.tags.name,
        distanceKm: haversineKm(lat, lon, el.lat, el.lon),
        strictlyVeg: el.tags["diet:vegetarian"] === "only",
    }));

    withDistance.sort((a: any, b: any) => a.distanceKm - b.distanceKm);

    return withDistance.slice(0, 3).map((h: any) => ({
        name: h.name,
        distanceHint: `Approx. ${h.distanceKm.toFixed(1)} km away`,
        dishes: GENERIC_SATVIK_DISHES,
        reason: h.strictlyVeg
            ? "Listed as a strictly pure-vegetarian establishment - a safe choice for fasting."
            : "Offers vegetarian and Indian dishes - check with staff for onion/garlic-free options if needed.",
    }));
}
