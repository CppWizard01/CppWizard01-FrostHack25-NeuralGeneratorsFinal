import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import axios from 'axios';
import Heurist from 'heurist';
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = 3003;

app.use(cors({
  origin: "https://frosthack25-neural-generators.vercel.app",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectDB() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
  }
}

connectDB();

// Heurist and OpenAI Clients
const heurist = new Heurist({ apiKey: process.env.HEURIST_API_KEY });
const openai = new OpenAI({
  apiKey: process.env.HEURIST_API_KEY,
  baseURL: "https://llm-gateway.heurist.xyz",
});

// Text Generation Function
async function generateText(prompt) {
  try {
    const completions = await openai.chat.completions.create({
      model: "mistralai/mixtral-8x7b-instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      stream: false,
    });
    return completions.choices[0]?.message?.content || "⚠️ No response generated.";
  } catch (error) {
    console.error("❌ Error generating text:", error);
    throw error;
  }
}

// Image Generation Function
async function generateImage(description) {
  try {
    const response = await heurist.smartgen.generateImage({
      description: description,
      image_model: "FLUX.1-dev",
      stylization_level: 3,
      detail_level: 4,
      color_level: 5,
      lighting_level: 2,
    });
    return response;
  } catch (error) {
    console.error("❌ Error generating image:", error);
    throw error;
  }
}

// Proxy Route for Audio Files
app.get('/proxy-audio', async (req, res) => {
  let audioUrl = req.query.url;

  if (!audioUrl) {
    return res.status(400).json({ error: "⚠️ No audio URL provided" });
  }

  // Ensure the URL is HTTP (not HTTPS)
  audioUrl = audioUrl.replace(/^https:/, "http:");

  try {
    // Forward the request and stream the response
    const response = await axios.get(audioUrl, { responseType: "stream" });

    // Set headers to serve as audio content
    res.setHeader("Content-Type", "audio/wav");
    response.data.pipe(res); // Stream the audio back to the frontend
  } catch (error) {
    console.error("❌ Proxy Error:", error);
    res.status(500).json({ error: "❌ Failed to fetch audio" });
  }
});

// GET /generate - Text and Image Generation
app.get('/generate', async (req, res) => {
  const { type, prompt } = req.query;

  if (!type) {
    return res.status(400).json({ error: '⚠️ Type is required' });
  }

  try {
    if (type === 'text') {
      if (!prompt) return res.status(400).json({ error: '⚠️ Prompt is required for text generation' });
      const textResponse = await generateText(prompt);
      return res.json({ text: textResponse });
    }

    if (type === 'image') {
      if (!prompt) return res.status(400).json({ error: '⚠️ Prompt is required for image generation' });
      const imageResponse = await generateImage(prompt);
      return res.json({ image_url: imageResponse.url });
    }

    return res.status(400).json({ error: "⚠️ Invalid type for GET request." });
  } catch (error) {
    return res.status(500).json({ error: "❌ Failed to generate content" });
  }
});

// POST /generate - Music Generation
app.post('/generate', async (req, res) => {
  const { type } = req.query;

  if (type === "music") {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: '⚠️ Prompt is required for music generation' });

      const response = await axios.post("http://provider.ranchercompute.com:30889/generate-audio", {
        prompt: prompt,
        duration: 10,
        negative: "fast",
      });

      const audioUrl = response.data.audio_url;

      return res.json({ audio_url: audioUrl });
    } catch (error) {
      console.error("❌ Error generating music:", error);
      return res.status(500).json({ error: "❌ Failed to generate music", details: error.message });
    }
  }

  return res.status(400).json({ error: "⚠️ Invalid type for POST request." });
});

// POST /saveChat - Save Chat Sessions to MongoDB
app.post('/saveChat', async (req, res) => {
  try {
    const { userId, chatSessions, sessionNames } = req.body;
    const database = client.db(process.env.MONGODB_DBNAME);
    const chats = database.collection('chats');

    await chats.updateOne(
      { userId: userId },
      { $set: { chatSessions: chatSessions, sessionNames: sessionNames } },
      { upsert: true }
    );

    res.json({ message: '✅ Chat sessions saved successfully' });
  } catch (error) {
    console.error('❌ Error saving chat sessions:', error);
    res.status(500).json({ error: '❌ Failed to save chat sessions' });
  }
});

// GET /loadChat/:userId - Load Chat Sessions from MongoDB
app.get('/loadChat/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const database = client.db(process.env.MONGODB_DBNAME);
    const chats = database.collection('chats');

    const chatData = await chats.findOne({ userId: userId });

    if (chatData) {
      res.json({ chatSessions: chatData.chatSessions, sessionNames: chatData.sessionNames });
    } else {
      res.json({ chatSessions: [[]], sessionNames: ["New Chat"] });
    }
  } catch (error) {
    console.error('❌ Error loading chat sessions:', error);
    res.status(500).json({ error: '❌ Failed to load chat sessions' });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
