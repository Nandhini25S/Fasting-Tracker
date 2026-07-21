import fs from "fs";
import path from "path";

const OLLAMA_HOST = "http://localhost:11434";
const MODEL = "llama3.2";

async function ollamaChat(system: string, prompt: string): Promise<string> {
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                { role: "system", content: system },
                { role: "user", content: prompt },
            ],
            stream: false,
        }),
    });
    if (!res.ok) throw new Error(`Ollama request failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.message.content as string;
}

async function main() {
    const system =
        "You are a warm, encouraging Tamil cultural and culinary assistant helping a devotee maintain their strict vegetarian fasting on Panchami. Format responses in clean markdown.";

    const recipe = await ollamaChat(
        system,
        "Suggest 3 delicious, nutritious, easy-to-cook traditional Tamil/South Indian pure vegetarian fasting recipes (strictly no egg, no meat). Include protein details and prep times."
    );

    const tips = await ollamaChat(
        system,
        "Give 4 practical fasting guidelines/motivation bullet points for someone fasting today on Tamil Panchami, eating strictly vegetarian."
    );

    const outDir = path.join(process.cwd(), "data");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
        path.join(outDir, "advice_cache.json"),
        JSON.stringify({ recipe, tips, generatedAt: new Date().toISOString() }, null, 2)
    );
    console.log("Wrote data/advice_cache.json");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
