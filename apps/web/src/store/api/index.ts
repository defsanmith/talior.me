// Need to use the React-specific entry point to import createApi
import { Config } from "@/lib/config";
import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";

// Base query with authentication header
const baseQuery = fetchBaseQuery({
  baseUrl: `${Config.API_BASE_URL}/api`,
  credentials: "include", // Include cookies for refresh token
  prepareHeaders: (headers, { getState }) => {
    // Access auth state without importing to avoid circular dependency
    const state = getState() as any;
    const token = state?.auth?.accessToken;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

// Prevents concurrent refresh requests from racing.
// Token rotation on the backend means only the first refresh succeeds;
// all others would fail and wrongly dispatch logout.
const refreshMutex = new Mutex();

// Base query with automatic token refresh
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  await refreshMutex.waitForUnlock();
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (!refreshMutex.isLocked()) {
      const release = await refreshMutex.acquire();
      try {
        const refreshResult = await baseQuery(
          { url: "/auth/refresh", method: "POST" },
          api,
          extraOptions,
        );

        if (refreshResult.data) {
          const refreshResponse = refreshResult.data as {
            data: { accessToken: string };
          };
          const accessToken = refreshResponse.data?.accessToken;
          if (accessToken) {
            api.dispatch({ type: "auth/setAccessToken", payload: accessToken });
            result = await baseQuery(args, api, extraOptions);
          } else {
            api.dispatch({ type: "auth/logout" });
          }
        } else {
          api.dispatch({ type: "auth/logout" });
        }
      } finally {
        release();
      }
    } else {
      // Another request already refreshed — retry with the new token
      await refreshMutex.waitForUnlock();
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};

// Define a service using a base URL and expected endpoints
export const appApi = createApi({
  reducerPath: "appApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Jobs",
    "Resume",
    "Profile",
    "Companies",
    "Positions",
    "Teams",
    "Presets",
    "ApiKeys",
  ],
  endpoints: (builder) => ({}),
});
