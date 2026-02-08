"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { useRefreshMutation } from "@/store/api/auth/queries";
import { setAccessToken, logout } from "@/store/slices/authSlice";

export function SessionRestorer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [refreshToken] = useRefreshMutation();
  const hasAttemptedRestore = useRef(false);

  useEffect(() => {
    // Only attempt restore once on mount
    if (hasAttemptedRestore.current) return;
    hasAttemptedRestore.current = true;

    const restoreSession = async () => {
      // If we have a stored token, try to refresh it to get a fresh one
      // This ensures the token is still valid and gets us a new one
      if (accessToken) {
        try {
          const result = await refreshToken().unwrap();
          dispatch(setAccessToken(result.accessToken));
        } catch (error) {
          // Refresh failed - token might be expired or invalid
          // Clear state but don't force logout (let user try to use existing token first)
          // The baseQueryWithReauth will handle 401s and logout if needed
        }
      } else {
        // No stored token, but we might have a refresh token cookie
        // Try to get a new access token
        try {
          const result = await refreshToken().unwrap();
          dispatch(setAccessToken(result.accessToken));
        } catch (error) {
          // No valid session, ensure state is cleared
          dispatch(logout());
        }
      }
    };

    restoreSession();
  }, []); // Only run on mount

  return <>{children}</>;
}
