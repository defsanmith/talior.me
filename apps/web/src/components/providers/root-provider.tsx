"use client";

import { store } from "@/store";
import { Provider } from "react-redux";
import { SessionRestorer } from "../auth/session-restorer";

export default function RootProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      <SessionRestorer>{children}</SessionRestorer>
    </Provider>
  );
}
