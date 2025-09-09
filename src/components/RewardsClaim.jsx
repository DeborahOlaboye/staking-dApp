import React from 'react';
import { formatEther } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

const RewardsClaim = ({ isConnected, pendingRewards, handleClaim }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim Rewards</CardTitle>
        <CardDescription>Claim your pending rewards</CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleClaim} 
          className="w-full"
          disabled={!isConnected}
        >
          {!isConnected ? 'Connect Wallet to Claim' : `Claim ${formatEther(pendingRewards || 0n)} Tokens`}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RewardsClaim;
