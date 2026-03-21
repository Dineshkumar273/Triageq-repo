import config from "./config";
import buildApp from "./app";
import { connectToDatabase } from "./config/db";

async function start(): Promise<void> {
  const app = await buildApp();

  await connectToDatabase(config.MONGO_URI);
  console.log("Starting server...", config);
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Server listening on ${config.host}:${config.port}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
