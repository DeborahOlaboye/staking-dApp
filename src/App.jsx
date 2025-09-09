import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import Header from './components/Header';
import UserPosition from './components/UserPosition';
import StakingForm from './components/StakingForm';
import WithdrawForm from './components/WithdrawForm';
import RewardsClaim from './components/RewardsClaim';
import ProtocolStats from './components/ProtocolStats';
import EmergencyWithdraw from './components/EmergencyWithdraw';
import useStaking from './hooks/useStaking';
import { Toaster } from 'sonner';

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
    <div className="min-h-screen bg-background">
      <Header isConnected={isConnected} address={address} />

      <div className="container mx-auto space-y-6 py-8">
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
          <>
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

            <WithdrawForm 
              isConnected={isConnected}
              withdrawAmount={withdrawAmount}
              setWithdrawAmount={setWithdrawAmount}
              handleWithdraw={handleWithdraw}
              canWithdraw={userStakingData.canWithdraw}
            />

            <RewardsClaim 
              isConnected={isConnected}
              pendingRewards={userStakingData.pendingRewards}
              handleClaim={handleClaim}
            />

            <EmergencyWithdraw 
              isConnected={isConnected}
              handleEmergencyWithdraw={handleEmergencyWithdraw}
            />
          </>
        )}
        
        <ProtocolStats 
          apr={protocolStats.apr}
          totalStaked={protocolStats.totalStaked}
          totalRewards={protocolStats.totalRewards}
          currentRewardRate={protocolStats.currentRewardRate}
        />
      </div>
      <Toaster />
    </div>
  );
}

export default App;