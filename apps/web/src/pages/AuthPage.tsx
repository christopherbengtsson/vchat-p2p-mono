import { observer } from "mobx-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { FastLoginButton } from "@/components/FastLoginButton";
import { useMainStore } from "../stores/MainStoreContext";

export const AuthPage = observer(function AuthPage() {
  const mainStore = useMainStore();
  const [loading, setLoading] = useState(false);

  const loginAnonymously = async () => {
    setLoading(true);
    await mainStore.authStore.loginAnonymously();
    setLoading(false);
  };

  return (
    <Card>
      <FastLoginButton loading={loading} onClick={loginAnonymously} />
    </Card>
  );
});
