const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.6-flash";

app.use(express.json({ limit: "50mb" }));
app.use(express.static(__dirname));

async function askGemini(parts) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in Render.");
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: parts
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Gemini API error:", data);

    throw new Error(
      data?.error?.message ||
      `Gemini API error (${response.status})`
    );
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned no text.");
  }

  return text;
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
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
        error: "No message."
      });
    }

    const reply = await askGemini([
      {
        text:
          "You are TopX AI, a friendly personal voice assistant. " +
          "Answer naturally, clearly, and concisely.\n\n" +
          "User: " +
          message
      }
    ]);

    res.json({ reply });

  } catch (error) {
    console.error("CHAT ERROR:", error);

    res.status(500).json({
      error: error.message
    });
  }
});

app.post("/api/voice", async (req, res) => {
  try {
    const audio = req.body?.audio;

    if (!audio) {
      return res.status(400).json({
        error: "No audio received."
      });
    }

    let mimeType = String(
      req.body?.mimeType || "audio/webm"
    )
      .split(";")[0]
      .toLowerCase();

    const allowedTypes = [
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/aac"
    ];

    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        error: `Unsupported audio type: ${mimeType}`
      });
    }

    const base64 = audio.replace(
      /^data:[^;]+;base64,/,
      ""
    );

    console.log(
      "VOICE RECEIVED:",
      mimeType,
      "base64 characters:",
      base64.length
    );

    const reply = await askGemini([
      {
        inline_data: {
          mime_type: mimeType,
          data: base64
        }
      },
      {
        text:
          "You are TopX AI, a voice-first personal assistant. " +
          "Understand what the user said in the audio and answer naturally. " +
          "Return only the response to the user."
      }
    ]);

    console.log("VOICE REPLY:", reply);

    res.json({
      reply: reply
    });

  } catch (error) {
    console.error("VOICE ERROR:", error);

    res.status(500).json({
      error:
        "TopX AI could not process the recording: " +
        error.message
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `TopX AI running on port ${PORT}`
  );
});
