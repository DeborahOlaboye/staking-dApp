import React from 'react';
import { formatEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Percent } from 'lucide-react';

const ProtocolStats = ({ apr, totalStaked, totalRewards, currentRewardRate }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-4 w-4" /> Protocol Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Initial APR</p>
          <p className="text-2xl font-bold">{(Number(apr) / 100 || 0).toFixed(2)}%</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Current Rate</p>
          <p className="text-2xl font-bold">{(Number(currentRewardRate) / 100 || 0).toFixed(2)}%</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total Staked</p>
          <p className="text-2xl font-bold">{formatEther(totalStaked || 0n)} Tokens</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total Rewards</p>
          <p className="text-2xl font-bold">{formatEther(totalRewards || 0n)} Tokens</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProtocolStats;
