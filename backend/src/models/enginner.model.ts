import mongoose from "mongoose";

const engineerSchema = new mongoose.Schema({
  name: String,
  role: String,
  capacity: Number,
  jiraAccountId: String,
});

export default mongoose.model("Engineer", engineerSchema);