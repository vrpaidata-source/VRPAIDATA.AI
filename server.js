import express from "express";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "20kb" }));
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const MODEL = process.env.OPENAI_MODEL || "gpt-5.5";

const ai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "பல கோரிக்கைகள் அனுப்பப்பட்டுள்ளன. ஒரு நிமிடம் கழித்து முயற்சிக்கவும்." }
});

app.use("/api", aiLimiter);

function getText(value, fieldName, maxLength = 4000) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} தேவை.`);
  }
  const cleaned = value.trim();
  if (cleaned.length > maxLength) {
    throw new Error(`${fieldName} ${maxLength} எழுத்துகளுக்குள் இருக்க வேண்டும்.`);
  }
  return cleaned;
}

async function generate(instructions, input) {
  if (!ai) {
    const error = new Error("சேவையகத்தில் OPENAI_API_KEY அமைக்கப்படவில்லை.");
    error.status = 503;
    throw error;
  }

  const response = await ai.responses.create({
    model: MODEL,
    instructions,
    input
  });

  return response.output_text || "மன்னிக்கவும், பதில் உருவாக்கப்படவில்லை.";
}

async function handleAI(req, res, taskName, instructions, buildInput) {
  try {
    const input = buildInput(req.body || {});
    const result = await generate(instructions, input);
    res.json({ result });
  } catch (error) {
    console.error(`[${taskName}]`, error);
    const status = error.status && Number.isInteger(error.status) ? error.status : 500;
    res.status(status).json({
      error: status === 503
        ? error.message
        : "AI சேவையில் பிழை ஏற்பட்டது. Server Logs-ஐ சரிபார்க்கவும்."
    });
  }
}

app.post("/api/chat", (req, res) => handleAI(
  req, res, "AI Chat",
  "நீங்கள் VRPAIDATA AI உதவியாளர். பயனரின் மொழியில் தெளிவாகவும் பயனுள்ளதாகவும் பதிலளிக்கவும். தமிழ் கேள்விகளுக்கு இயல்பான, பிழையற்ற தமிழில் பதிலளிக்கவும்.",
  body => getText(body.message, "கேள்வி")
));

app.post("/api/write", (req, res) => handleAI(
  req, res, "AI Writer",
  "நீங்கள் ஒரு திறமையான தமிழ் மற்றும் ஆங்கில எழுத்து உதவியாளர். பயனர் கேட்ட வடிவம், மொழி, தொனி ஆகியவற்றைப் பின்பற்றி தரமான எழுத்தை உருவாக்கவும்.",
  body => {
    const topic = getText(body.topic, "தலைப்பு");
    const style = getText(body.style, "எழுத்து வகை", 100);
    return `${style} வடிவில் எழுதுங்கள்:\n${topic}`;
  }
));

app.post("/api/translate", (req, res) => handleAI(
  req, res, "AI Translator",
  "நீங்கள் துல்லியமான மொழிபெயர்ப்பாளர். பொருள், தொனி மற்றும் பெயர்களைப் பாதுகாத்து, விளக்கங்களைச் சேர்க்காமல் கேட்ட மொழிக்கு மொழிபெயர்க்கவும்.",
  body => {
    const text = getText(body.text, "மொழிபெயர்க்க வேண்டிய உரை");
    const direction = getText(body.direction, "மொழிபெயர்ப்பு திசை", 100);
    return `${direction} மொழிபெயர்க்கவும்:\n${text}`;
  }
));

app.get("/health", (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(ai), model: MODEL });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`VRPAIDATA AI running on port ${PORT}`);
  console.log(`OpenAI API key configured: ${Boolean(ai)}`);
});
