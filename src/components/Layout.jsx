import React from 'react';
import { useAccount } from 'wagmi';
import Header from './Header';
import { Toaster } from 'sonner';

const AppLayout = ({ children }) => {
  const { address, isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-background">
      <Header isConnected={isConnected} address={address} />
      
      <div className="container mx-auto space-y-6 py-8">
        {children}
      </div>
      
      <Toaster />
    </div>
  );
};

export default AppLayout;
