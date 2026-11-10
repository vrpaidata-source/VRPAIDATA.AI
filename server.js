const express = require("express");
const OpenAI = require("openai");
const path = require("path");

const app = express();

app.use(express.json({ limit: "20kb" }));
app.use(express.static(__dirname));

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generate(prompt) {
  const response = await ai.responses.create({
    model: "gpt-5.5",
    input: prompt
  });

  return response.output_text;
}

app.post("/api/chat", async (req, res) => {
  try {
    const result = await generate(req.body.message);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: "AI Chat failed" });
  }
});

app.post("/api/write", async (req, res) => {
  try {
    const result = await generate(
      `${req.body.style} எழுதுங்கள்: ${req.body.topic}`
    );
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: "AI Writer failed" });
  }
});

app.post("/api/translate", async (req, res) => {
  try {
    const result = await generate(
      `${req.body.direction} மொழிபெயர்க்கவும்: ${req.body.text}`
    );
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: "Translation failed" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`VRPAIDATA AI running on port ${PORT}`);
});
