import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { authApi, AuthResponse } from "../api/auth/queries";

interface AuthState {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  } | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

// Load initial state from localStorage
const loadAuthState = (): Partial<AuthState> => {
  if (typeof window === "undefined") {
    return { user: null, accessToken: null, isAuthenticated: false };
  }

  try {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        user: parsed.user || null,
        accessToken: parsed.accessToken || null,
        isAuthenticated: !!parsed.accessToken && !!parsed.user,
      };
    }
  } catch (error) {
    console.error("Failed to load auth state from localStorage:", error);
  }

  return { user: null, accessToken: null, isAuthenticated: false };
};

const initialState: AuthState = {
  ...loadAuthState(),
  user: loadAuthState().user || null,
  accessToken: loadAuthState().accessToken || null,
  isAuthenticated: loadAuthState().isAuthenticated || false,
};

// Save auth state to localStorage
const saveAuthState = (state: AuthState) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: state.user,
        accessToken: state.accessToken,
      })
    );
  } catch (error) {
    console.error("Failed to save auth state to localStorage:", error);
  }
};

// Clear auth state from localStorage
const clearAuthState = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("auth");
  } catch (error) {
    console.error("Failed to clear auth state from localStorage:", error);
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthResponse>) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      saveAuthState(state);
    },
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      saveAuthState(state);
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      clearAuthState();
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        authApi.endpoints.login.matchFulfilled,
        (state, action) => {
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
          state.isAuthenticated = true;
          saveAuthState(state);
        }
      )
      .addMatcher(
        authApi.endpoints.register.matchFulfilled,
        (state, action) => {
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
          state.isAuthenticated = true;
          saveAuthState(state);
        }
      )
      .addMatcher(
        authApi.endpoints.refresh.matchFulfilled,
        (state, action) => {
          state.accessToken = action.payload.accessToken;
          saveAuthState(state);
        }
      )
      .addMatcher(
        authApi.endpoints.logout.matchFulfilled,
        (state) => {
          state.user = null;
          state.accessToken = null;
          state.isAuthenticated = false;
          clearAuthState();
        }
      );
  },
});

export const { setCredentials, setAccessToken, logout } = authSlice.actions;
export default authSlice.reducer;
