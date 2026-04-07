import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Network } from "@capacitor/network";
import { App } from "@capacitor/app";
import { useToast } from "@/hooks/use-toast";
import { flushOfflineMutations } from "@/lib/api";
import { hapticLight, hapticMedium, isNativeApp } from "@/lib/native";

export function NativeAppBridge() {
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isNativeApp()) return;

    const networkListener = Network.addListener(
      "networkStatusChange",
      async (status) => {
        if (status.connected) {
          await hapticMedium();
          await flushOfflineMutations();
          toast({
            title: "Back online",
            description: "Queued changes are being synchronized.",
          });
        } else {
          toast({
            title: "Offline mode",
            description: "You can continue. Changes will be queued for sync.",
          });
        }
      },
    );

    const backButtonListener = App.addListener("backButton", async () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        await App.exitApp();
      }
    });

    return () => {
      void networkListener.then((l) => l.remove()).catch(() => undefined);
      void backButtonListener.then((l) => l.remove()).catch(() => undefined);
    };
  }, [toast]);

  useEffect(() => {
    if (!isNativeApp()) return;
    void hapticLight();
  }, [location.pathname]);

  return null;
}
