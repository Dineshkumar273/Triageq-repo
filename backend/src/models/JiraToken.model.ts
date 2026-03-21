import { profile, time } from "console";
import mongoose from "mongoose";
import { ref } from "process";

const JiraTokenSchema = new mongoose.Schema({
  accessToken: { type: String, required: true },
  userId: { type: String, required: true },
  cloudId: { type: String, required: true },
  userInformation:{type:Object,required:true},
  profileurl: { type: String, required: true },
  refreshToken: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  timestamp: { type: Date, default: Date.now },


});

export const JiraToken = mongoose.model("jira_tokens", JiraTokenSchema);
