const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: "30mb" }));
app.use(express.static(__dirname));

async function askAI(parts) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "AI request failed."
    );
  }

  return (
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim() || "I couldn't generate a response."
  );
}

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

app.get("/health", (req, res) => {
  res.json({
    online: true,
    name: "TopX AI"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(
      req.body?.message || ""
    ).trim();

    if (!message) {
      return res.status(400).json({
        error: "Message is empty."
      });
    }

    const reply = await askAI([
      {
        text: `You are TopX AI, a smart personal voice assistant.

Be intelligent, friendly, natural and concise.
Never pretend you performed an action that you cannot actually perform.
The user said:

${message}`
      }
    ]);

    res.json({ reply });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
});

app.post("/api/voice", async (req, res) => {
  try {
    const audio = req.body?.audio;
    const mimeType =
      String(
        req.body?.mimeType ||
        "audio/webm"
      ).split(";")[0];

    if (!audio) {
      return res.status(400).json({
        error: "No audio received."
      });
    }

    const base64Audio =
      audio.replace(
        /^data:[^;]+;base64,/,
        ""
      );

    const reply = await askAI([
      {
        inline_data: {
          mime_type: mimeType,
          data: base64Audio
        }
      },
      {
        text: `You are TopX AI.

Listen to the user's voice recording.
Understand what the user said.
Reply naturally as a personal AI assistant.

Return only the answer that should be spoken aloud.
Keep it reasonably short.`
      }
    ]);

    res.json({ reply });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `TopX AI running on port ${PORT}`
  );
});
