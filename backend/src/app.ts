import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import mercurius from 'mercurius';
import schema from './graphql/schema';
import resolvers from './graphql/resolvers';
import healthRoute from './routes/health';
import authRoutes from './routes/authRoutes';
import cors from '@fastify/cors';
import jwt from "jsonwebtoken";


export default async function buildApp(
  opts: FastifyServerOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({ logger: true, ...opts });

  app.register(cors,{
    origin:"*"
  })
  app.register(mercurius, {
    schema,
    resolvers,
    graphiql: true,
    context:async (req, reply) => {
    const authHeader = req.headers.authorization || "";

    console.log(authHeader)

    if (!authHeader.startsWith("Bearer ")) {
      return {};
    }

    try {
      const token = authHeader.replace("Bearer ", "");

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

      console.log("Decoded User:", decoded);

      return {
        user: decoded,
      };
    } catch (err) {
      console.log("Token error:", err);
      return {};
    }
  },
  });

  app.register(healthRoute);
  app.register(authRoutes);

  return app;
}
