// Need to use the React-specific entry point to import createApi
import { Config } from "@/lib/config";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Define a service using a base URL and expected endpoints
export const appApi = createApi({
  reducerPath: "appApi",
  baseQuery: fetchBaseQuery({ baseUrl: Config.API_BASE_URL }),
  tagTypes: ["Jobs", "Resume", "Profile"],
  endpoints: (builder) => ({}),
});
