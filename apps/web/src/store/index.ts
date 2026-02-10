import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { appApi } from "./api";
// Import authApi to ensure it's initialized before authSlice uses it
import "./api/auth/queries";
import authReducer from "./slices/authSlice";

export const store = configureStore({
  reducer: {
    [appApi.reducerPath]: appApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore serialization check for PDF blob responses in RTK Query
        ignoredActions: [
          "appApi/executeQuery/fulfilled",
          "appApi/executeQuery/pending",
        ],
        ignoredActionPaths: ["meta.arg", "meta.baseQueryMeta", "payload"],
        ignoredPaths: ["appApi.queries", "appApi.mutations"],
      },
    }).concat(appApi.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

// Export pre-typed hooks
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
