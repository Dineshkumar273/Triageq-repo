import mongoose from "mongoose";

const engineerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: String,
  capacity: Number,
  jiraAccountId: String,
  userId: { type: String, required: true, index: true },
  projectKey: { type: String, required: true, index: true },
  avatar: String,
});

engineerSchema.index(
  { userId: 1, projectKey: 1, jiraAccountId: 1 },
  {
    unique: true,
    partialFilterExpression: { jiraAccountId: { $type: "string" } },
  }
);

export default mongoose.model("Engineer", engineerSchema);
