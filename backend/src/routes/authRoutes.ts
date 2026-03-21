import { FastifyInstance } from "fastify";
import axios from "axios";
import jwt from "jsonwebtoken";
import { setAccessToken } from "../auth/auth.service";
import config from "../config";
import { JiraToken } from "../models/JiraToken.model";

export default async function authRoutes(app: FastifyInstance) {
  const getRequestOrigin = (req: any) => {
    const proto =
      (req.headers["x-forwarded-proto"] as string) || req.protocol || "http";
    const host =
      (req.headers["x-forwarded-host"] as string) ||
      (req.headers.host as string);

    return host ? `${proto}://${host}` : config.baseUrl;
  };

  app.get("/auth/jira/login", async (_req, reply) => {
    const scopes = [
      "read:jira-user",
      "read:jira-work",
      "read:project:jira",
      "write:jira-work",
      "read:board-scope:jira-software",
      "write:sprint:jira-software",
      "offline_access",
    ].join(" ");

    const url = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${config.clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(`${config.baseUrl}/auth/jira/callback`)}&response_type=code&prompt=consent`;
    console.log("Redirecting to Jira login...", url);
    reply.redirect(url);
  });

  app.get("/auth/jira/callback", async (req, reply) => {
    try {
      const { code } = req.query as { code?: string };

      const tokenRes = await axios.post("https://auth.atlassian.com/oauth/token", {
        grant_type: "authorization_code",
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: `${config.baseUrl}/auth/jira/callback`,
      });

      const accessToken = tokenRes.data.access_token;

      const resourceRes = await axios.get(
        "https://api.atlassian.com/oauth/token/accessible-resources",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!resourceRes.data.length) {
        throw new Error("No Jira sites found");
      }

      const cloudId = resourceRes.data[0].id;

      const profileData = await axios.get(
        `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      JiraToken.findOneAndUpdate(
        { userId: resourceRes.data[0].name },
        {
          accessToken,
          refreshToken: tokenRes.data.refresh_token,
          profileurl: resourceRes.data[0].avatarUrl,
          userInformation: profileData.data,
          cloudId,
          expiresAt: new Date(Date.now() + tokenRes.data.expires_in * 1000),
        },
        {
          upsert: true,
          new: true,
        }
      )
        .then((doc) => {
          console.log("Saved token to DB:", doc);
          setAccessToken(accessToken, cloudId);
        })
        .catch((err) => {
          console.error("Failed to save token to DB:", err);
        });

      const appToken = jwt.sign(
        {
          id: resourceRes.data[0].name,
          cloudId,
        },
        config.JWT_SECRET!,
        { expiresIn: "1d" }
      );

      const frontendOrigin = getRequestOrigin(req);
      return reply.redirect(`${frontendOrigin}/?token=${appToken}`);
    } catch (err: any) {
      console.error("Callback error:", err.response?.data || err.message);

      return reply.status(500).send({
        error: "OAuth failed",
        details: err.response?.data || err.message,
      });
    }
  });
}
