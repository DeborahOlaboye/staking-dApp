import { useMemo } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';

// Simplified adapter without ethers dependency
export function useEthersProvider() {
  const publicClient = usePublicClient();
  
  return useMemo(() => {
    if (!publicClient) return null;
    
    // Return a simplified provider object for compatibility
    return {
      getNetwork: () => publicClient.chain,
      getSigner: () => null, // Will be handled by wagmi
    };
  }, [publicClient]);
}

export function useEthersSigner() {
  const { data: walletClient } = useWalletClient();
  
  return useMemo(() => {
    if (!walletClient) return null;
    
    // Return wallet client directly for compatibility
    return walletClient;
  }, [walletClient]);
}
