import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { TrendingUp, Wallet } from 'lucide-react';

const Header = ({ isConnected, address }) => {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          <h1 className="text-xl font-bold">Staking DApp</h1>
        </div>
        <div className="flex items-center gap-4">
          {isConnected ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </div>
          ) : null}
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}

export default Header