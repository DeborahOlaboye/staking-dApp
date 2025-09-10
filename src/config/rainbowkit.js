import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";
import { http } from "viem";

export const config = getDefaultConfig({
    appName: "Staking dApp",
    projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "default_project_id",
    chains: [sepolia],
    transports: {
        [sepolia.id]: http(import.meta.env.VITE_RPC_URL || "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"),
    },
});
