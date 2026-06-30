import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api.js";

export const registerUser = createAsyncThunk("auth/register", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post("/auth/register", data);
    localStorage.setItem("token", res.data.token);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || "Registration failed");
  }
});

export const loginUser = createAsyncThunk("auth/login", async (data, { rejectWithValue }) => {
  try {
    const res = await api.post("/auth/login", data);
    localStorage.setItem("token", res.data.token);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || "Login failed");
  }
});

export const loadUser = createAsyncThunk("auth/loadUser", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/auth/me");
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || "Failed to load user");
  }
});

export const updateProfile = createAsyncThunk("auth/updateProfile", async (data, { rejectWithValue }) => {
  try {
    const res = await api.put("/auth/profile", data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || "Update failed");
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: localStorage.getItem("token"),
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      localStorage.removeItem("token");
    },
    updateOnlineStatus(state, action) {
      // Update online status of other users if needed
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => { state.loading = false; state.error = action.payload; };

    builder
      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(registerUser.rejected, rejected)

      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, rejected)

      .addCase(loadUser.pending, pending)
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
      })
      .addCase(loadUser.rejected, (state) => {
        state.loading = false;
        state.token = null;
        localStorage.removeItem("token");
      })

      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload.user;
      });
  },
});

export const { logout, updateOnlineStatus, clearError } = authSlice.actions;
export default authSlice.reducer;
