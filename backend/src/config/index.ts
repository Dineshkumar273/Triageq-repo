import dotenv from "dotenv";
import path from "path";


dotenv.config({ path: path.resolve(process.cwd(), ".env") });


console.log("Loaded config from .env:", {
  PORT: Number(process.env.PORT),
  HOST: process.env.HOST,
  BASE_URL: process.env.BASE_URL,
  JIRA_BASE_URL: process.env.JIRA_BASE_URL,
  JIRA_CLIENT_ID: process.env.JIRA_CLIENT_ID,
  JIRA_CLIENT_SECRET: process.env.JIRA_CLIENT_SECRET,
});

const port = Number(process.env.PORT) || 5000;
const host = process.env.HOST?.trim() || "0.0.0.0";
const baseUrl = process.env.BASE_URL?.trim();
const jiraBaseUrl = process.env.JIRA_BASE_URL?.trim();
const clientId = process.env.JIRA_CLIENT_ID?.trim();
const clientSecret = process.env.JIRA_CLIENT_SECRET?.trim();
const JWT_SECRET = process.env.JWT_SECRET?.trim();
const config = {
  port,
  host,
  baseUrl,
  jiraBaseUrl,
  clientId,
  clientSecret,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/triageiq',
  JWT_SECRET,
  OLLAMA_API_KEY:process.env.OLLAMA_API_KEY
};

export default config;
