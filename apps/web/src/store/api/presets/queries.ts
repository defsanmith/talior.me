import {
  ApiResponse,
  CreatePresetDto,
  PreviewPresetDto,
  ResumePreset,
  UpdatePresetDto,
} from "@tailor.me/shared";
import { appApi } from "..";

interface PresetsListResponse {
  presets: ResumePreset[];
}

interface PresetResponse {
  preset: ResumePreset;
}

interface UpdatePresetArgs {
  presetId: string;
  data: UpdatePresetDto;
}

export const presetsApi = appApi.injectEndpoints({
  endpoints: (build) => ({
    getPresets: build.query<ApiResponse<PresetsListResponse>, void>({
      query: () => ({ url: "/presets", method: "GET" }),
      providesTags: ["Presets"],
    }),

    createPreset: build.mutation<ApiResponse<PresetResponse>, CreatePresetDto>({
      query: (body) => ({ url: "/presets", method: "POST", body }),
      invalidatesTags: ["Presets"],
    }),

    updatePreset: build.mutation<ApiResponse<PresetResponse>, UpdatePresetArgs>(
      {
        query: ({ presetId, data }) => ({
          url: `/presets/${presetId}`,
          method: "PATCH",
          body: data,
        }),
        invalidatesTags: ["Presets"],
      },
    ),

    deletePreset: build.mutation<ApiResponse<{ success: boolean }>, string>({
      query: (presetId) => ({
        url: `/presets/${presetId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Presets"],
    }),

    setDefaultPreset: build.mutation<ApiResponse<PresetResponse>, string>({
      query: (presetId) => ({
        url: `/presets/${presetId}/default`,
        method: "POST",
      }),
      invalidatesTags: ["Presets"],
    }),

    previewPreset: build.mutation<Blob, PreviewPresetDto>({
      query: (body) => ({
        url: "/presets/preview",
        method: "POST",
        body,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetPresetsQuery,
  useCreatePresetMutation,
  useUpdatePresetMutation,
  useDeletePresetMutation,
  useSetDefaultPresetMutation,
  usePreviewPresetMutation,
} = presetsApi;
