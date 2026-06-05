import { ApiResponse } from "@tailor.me/shared";
import { appApi } from "..";

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface CreateApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  expiresAt: string | null;
  key: string;
}

interface CreateApiKeyDto {
  name: string;
  expiresAt?: string;
}

export const apiKeysApi = appApi.injectEndpoints({
  endpoints: (build) => ({
    getApiKeys: build.query<ApiResponse<ApiKey[]>, void>({
      query: () => ({ url: "/api-keys", method: "GET" }),
      providesTags: ["ApiKeys"],
    }),

    createApiKey: build.mutation<
      ApiResponse<CreateApiKeyResponse>,
      CreateApiKeyDto
    >({
      query: (body) => ({ url: "/api-keys", method: "POST", body }),
      invalidatesTags: ["ApiKeys"],
    }),

    deleteApiKey: build.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/api-keys/${id}`, method: "DELETE" }),
      invalidatesTags: ["ApiKeys"],
    }),
  }),
});

export const {
  useGetApiKeysQuery,
  useCreateApiKeyMutation,
  useDeleteApiKeyMutation,
} = apiKeysApi;
