import { createSlice } from "@reduxjs/toolkit";

function getStoredProjectKey() {
  try {
    return localStorage.getItem("projectKey");
  } catch (error) {
    console.error("Failed to read projectKey from storage.", error);
    return null;
  }
}

function persistProjectKey(projectKey) {
  try {
    if (projectKey) {
      localStorage.setItem("projectKey", projectKey);
      return;
    }

    localStorage.removeItem("projectKey");
  } catch (error) {
    console.error("Failed to persist projectKey to storage.", error);
  }
}

const projectSlice = createSlice({
  name: "project",
  initialState: {
    projectKey: getStoredProjectKey(),
    selectionVersion: 0,
  },
  reducers: {
    setProjectKey(state, action) {
      state.projectKey = action.payload || null;
      state.selectionVersion += 1;
      persistProjectKey(state.projectKey);
    },
    clearProjectKey(state) {
      state.projectKey = null;
      state.selectionVersion += 1;
      persistProjectKey(null);
    },
  },
});

export const { setProjectKey, clearProjectKey } = projectSlice.actions;
export default projectSlice.reducer;
