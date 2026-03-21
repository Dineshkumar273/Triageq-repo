let accessToken: string | null = null;
let cloudId: string | null = null;

export function setAccessToken(token: string, id: string) {
  accessToken = token;
  cloudId = id;
}

export function getAccessToken() {
  return accessToken;
}

export function getCloudId() {
  return cloudId;
}


import axios from "axios";

export async function refreshAccessToken(refreshToken: string) {
  const res = await axios.post(
    "https://auth.atlassian.com/oauth/token",
    {
      grant_type: "refresh_token",
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      refresh_token: refreshToken,
    }
  );

  return res.data;
}