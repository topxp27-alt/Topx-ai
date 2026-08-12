const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(express.json({ limit: "50mb" }));
app.use(express.static(__dirname));

async function askGemini(parts) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing in Render.");
  }

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    "gemini-2.5-flash:generateContent?key=" +
    encodeURIComponent(GEMINI_API_KEY);

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
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

  const data = await r.json();

  if (!r.ok) {
    console.error("Gemini error:", data);
    throw new Error(
      data?.error?.message ||
      "Gemini request failed."
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map(p => p.text || "")
      .join("")
      .trim();

  if (!text) {
    throw new Error("Gemini returned no text.");
  }

  return text;
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
        error: "No message."
      });
    }

    const reply = await askGemini([
      {
        text:
          "You are TopX AI, a friendly personal voice assistant. " +
          "Answer naturally and concisely.\n\n" +
          "User: " +
          message
      }
    ]);

    res.json({ reply });

  } catch (error) {
    console.error("Chat:", error);

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

    let mimeType =
      String(
        req.body?.mimeType ||
        "audio/webm"
      ).split(";")[0];

    /*
      Gemini supports common audio formats.
      iPhone Safari may return audio/mp4,
      while other browsers commonly return audio/webm.
    */

    const allowed = [
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/aac"
    ];

    if (!allowed.includes(mimeType)) {
      mimeType = "audio/webm";
    }

    const base64 =
      audio.replace(
        /^data:[^;]+;base64,/,
        ""
      );

    console.log(
      "Voice received:",
      mimeType,
      "bytes:",
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
          "You are TopX AI. " +
          "Listen to the user's recording and understand what they said. " +
          "Reply naturally as a personal voice assistant. " +
          "Return ONLY the answer to the user. " +
          "Keep the answer reasonably short."
      }
    ]);

    console.log("Voice reply:", reply);

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
