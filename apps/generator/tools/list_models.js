// tools/list-models.js
import "dotenv/config";
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const out = await openai.models.list();
console.log(out.data.map(m => m.id).sort());