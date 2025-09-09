import React from 'react';
import { formatEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Clock } from 'lucide-react';

const UserPosition = ({ isConnected, stakedBalance, pendingRewards, timeUntilUnlock }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <h1>Your Stake Position</h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Staked Balance</p>
          <p className="text-2xl font-bold">
            {isConnected ? formatEther(stakedBalance || 0n) : '0.00'} Tokens
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Pending Rewards</p>
          <p className="text-2xl font-bold">
            {isConnected ? formatEther(pendingRewards || 0n) : '0.00'} Tokens
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Time Until Unlock</p>
          <p className="text-2xl font-bold">
            {isConnected ? (
              timeUntilUnlock > 0 ? `${Math.floor(timeUntilUnlock / 3600)}h` : 'Unlocked'
            ) : 'Connect wallet'}
            {isConnected && timeUntilUnlock > 0 && <Clock className="h-4 w-4 inline ml-1" />}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserPosition;
