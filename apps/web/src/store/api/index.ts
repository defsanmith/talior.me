// Need to use the React-specific entry point to import createApi
import { Config } from "@/lib/config";
import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

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

// Base query with automatic token refresh
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    // Try to refresh the token
    const refreshResult = await baseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      // Store new access token - use action type string to avoid circular dependency
      // Response is wrapped in { success: true, data: { accessToken: ... } }
      const refreshResponse = refreshResult.data as {
        data: { accessToken: string };
      };
      const accessToken = refreshResponse.data?.accessToken;
      if (accessToken) {
        api.dispatch({
          type: "auth/setAccessToken",
          payload: accessToken,
        });

        // Retry original request
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, logout user
        api.dispatch({ type: "auth/logout" });
      }
    } else {
      // Refresh failed, logout user
      api.dispatch({ type: "auth/logout" });
    }
  }

  return result;
};

// Define a service using a base URL and expected endpoints
export const appApi = createApi({
  reducerPath: "appApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Jobs", "Resume", "Profile", "Companies", "Positions", "Teams"],
  endpoints: (builder) => ({}),
});
