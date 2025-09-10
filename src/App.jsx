import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import AppLayout from "./components/Layout";
import UserPosition from './components/UserPosition';
import StakingForm from './components/StakingForm';
import WithdrawForm from './components/WithdrawForm';
import RewardsClaim from './components/RewardsClaim';
import ProtocolStats from './components/ProtocolStats';
import EmergencyWithdraw from './components/EmergencyWithdraw';
import useStaking from './hooks/useStaking';

function App() {
  const { address, isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const {
    userStakingData,
    protocolStats,
    isLoading,
    approveTokens,
    stakeTokens,
    withdrawTokens,
    claimRewards,
    emergencyWithdraw,
  } = useStaking();


  const handleApprove = async () => {
    const success = await approveTokens(stakeAmount);
    if (success) {
    }
  };

  const handleStake = async () => {
    const success = await stakeTokens(stakeAmount);
    if (success) {
      setStakeAmount('');
    }
  };

  const handleWithdraw = async () => {
    const success = await withdrawTokens(withdrawAmount);
    if (success) {
      setWithdrawAmount(''); 
    }
  };

  const handleClaim = async () => {
    await claimRewards();
  };

  const handleEmergencyWithdraw = async () => {
    await emergencyWithdraw();
  };

  return (
    <AppLayout>
      <div className="flex w-full flex-col gap-6">
        {!isConnected && (
          <Card className="w-[400px] mx-auto">
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>Connect to start staking</CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectButton />
            </CardContent>
          </Card>
        )}

        <UserPosition 
          isConnected={isConnected}
          stakedBalance={userStakingData.stakedBalance}
          pendingRewards={userStakingData.pendingRewards}
          timeUntilUnlock={userStakingData.timeUntilUnlock}
        />

        {isConnected && (
          <Tabs defaultValue="stake" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="stake" className="cursor-pointer">
                Stake
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="cursor-pointer">
                Withdraw
              </TabsTrigger>
              <TabsTrigger value="rewards" className="cursor-pointer">
                Rewards
              </TabsTrigger>
              <TabsTrigger value="emergency" className="cursor-pointer">
                Emergency
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stake">
              <StakingForm 
                isConnected={isConnected}
                stakeAmount={stakeAmount}
                setStakeAmount={setStakeAmount}
                handleApprove={handleApprove}
                handleStake={handleStake}
                isStakingPending={isLoading}
                tokenBalance={userStakingData.tokenBalance}
                tokenAllowance={userStakingData.tokenAllowance}
              />
            </TabsContent>

            <TabsContent value="withdraw">
              <WithdrawForm 
                isConnected={isConnected}
                withdrawAmount={withdrawAmount}
                setWithdrawAmount={setWithdrawAmount}
                handleWithdraw={handleWithdraw}
                canWithdraw={userStakingData.canWithdraw}
              />
            </TabsContent>

            <TabsContent value="rewards">
              <RewardsClaim 
                isConnected={isConnected}
                pendingRewards={userStakingData.pendingRewards}
                handleClaim={handleClaim}
              />
            </TabsContent>

            <TabsContent value="emergency">
              <EmergencyWithdraw 
                isConnected={isConnected}
                handleEmergencyWithdraw={handleEmergencyWithdraw}
                emergencyWithdrawPenalty={protocolStats.emergencyWithdrawPenalty}
                stakedBalance={userStakingData.stakedBalance}
              />
            </TabsContent>
          </Tabs>
        )}
        
        <ProtocolStats 
          apr={protocolStats.apr}
          totalStaked={protocolStats.totalStaked}
          totalRewards={protocolStats.totalRewards}
          currentRewardRate={protocolStats.currentRewardRate}
        />
      </div>
    </AppLayout>
  );
}

export default App;