import { useMemo } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { ethers } from 'ethers';

export function useEthersProvider() {
  const publicClient = usePublicClient();
  
  return useMemo(() => {
    if (!publicClient) return null;
    
    return new ethers.BrowserProvider(window.ethereum);
  }, [publicClient]);
}

export function useEthersSigner() {
  const { data: walletClient } = useWalletClient();
  
  return useMemo(async () => {
    if (!walletClient) return null;
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    return provider.getSigner();
  }, [walletClient]);
}
