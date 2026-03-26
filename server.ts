import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // LLaMA API Proxy
  app.post("/api/llama", async (req, res) => {
    const { messages } = req.body;
    const apiKey = process.env.LLAMA_API_KEY;
    const apiUrl = process.env.LLAMA_API_URL || "https://api.groq.com/openai/v1/chat/completions";

    if (!apiKey) {
      return res.status(400).json({ error: "LLAMA_API_KEY is not configured." });
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.2-3b-preview", // Defaulting to 3.2 3B if available
          messages,
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("LLaMA API Error:", error);
      res.status(500).json({ error: "Failed to call LLaMA API" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
