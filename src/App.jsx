import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseEther } from 'viem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import Header from './components/Header';
import UserPosition from './components/UserPosition';
import StakingForm from './components/StakingForm';
import WithdrawForm from './components/WithdrawForm';
import RewardsClaim from './components/RewardsClaim';
import ProtocolStats from './components/ProtocolStats';
import EmergencyWithdraw from './components/EmergencyWithdraw';
import { stakingAbi } from './config/ABI';
import { erc20Abi } from './config/ERC20';
import { Toaster } from 'sonner';
import { toast } from 'sonner';

const CONTRACT_ADDRESS = '0xd9145CCE52D386f254917e481eB44e9943F39138';
const TOKEN_ADDRESS = '0xefec53fa6759fcdd49c3e084b69286a8967c7db2';

function App() {
  const { address, isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');


  const { data: stakingToken } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingAbi,
    functionName: 'stakingToken',
  });

  
  const { data: tokenBalance, error: balanceError, refetch: refetchTokenBalance } = useReadContract({
    address: stakingToken || TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  });


  const { data: tokenAllowance, error: allowanceError, refetch: refetchTokenAllowance } = useReadContract({
    address: stakingToken || TOKEN_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address, CONTRACT_ADDRESS],
    enabled: !!address,
  });

  React.useEffect(() => {
    if (balanceError) {
      console.error('Balance read error:', balanceError);
    }
    if (allowanceError) {
      console.error('Allowance read error:', allowanceError);
    }
  }, [balanceError, allowanceError]);


  const { data: userDetails, refetch: refetchUserDetails } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingAbi,
    functionName: 'getUserDetails',
    args: [address],
    enabled: !!address,
  });
  

  const stakedBalance = userDetails?.stakedAmount || 0n;
  const pendingRewards = userDetails?.pendingRewards || 0n;
  const timeUntilUnlock = userDetails?.timeUntilUnlock || 0;
  const canWithdraw = userDetails?.canWithdraw || false;
  

  const { data: userInfo } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingAbi,
    functionName: 'userInfo',
    args: [address],
    enabled: !!address && !userDetails,
  });
  
  const { data: pendingRewardsAlt } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingAbi,
    functionName: 'getPendingRewards',
    args: [address],
    enabled: !!address && !userDetails,
  });
  
  const { data: timeUntilUnlockAlt } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingAbi,
    functionName: 'getTimeUntilUnlock',
    args: [address],
    enabled: !!address && !userDetails,
  });
 
  const finalStakedBalance = stakedBalance || (userInfo?.[0] || 0n);
  const finalPendingRewards = pendingRewards || (pendingRewardsAlt || 0n);
  const finalTimeUntilUnlock = timeUntilUnlock || (timeUntilUnlockAlt ? Math.max(0, Number(timeUntilUnlockAlt) - Date.now() / 1000) : 0);
  const finalCanWithdraw = canWithdraw || (finalTimeUntilUnlock <= 0);

  const { data: apr } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingAbi,
    functionName: 'initialApr',
  });
  const { data: currentRewardRate } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingAbi,
    functionName: 'currentRewardRate',
  });
  const { data: totalStaked, refetch: refetchTotalStaked } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingAbi,
    functionName: 'totalStaked',
  });
  const { data: totalRewards } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: stakingAbi,
    functionName: 'getTotalRewards',
  });

  
  const { writeContract, error: writeError, data: writeData, isPending: isWritePending } = useWriteContract();
  const { isPending: isStakingPending, isSuccess: isTransactionSuccess, error: receiptError } = useWaitForTransactionReceipt({ 
    hash: writeData,
    enabled: !!writeData 
  });

  
  const handleApprove = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first!');
      return;
    }
    if (!stakeAmount || isNaN(parseFloat(stakeAmount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    const stakeAmountBigInt = parseEther(stakeAmount);
    console.log('stakeAmountBigInt:', stakeAmountBigInt.toString());
    console.log('tokenBalance:', tokenBalance?.toString());
    
    if (tokenBalance && stakeAmountBigInt > tokenBalance) {
      toast.error('Insufficient token balance');
      return;
    }
    
    const tokenAddress = stakingToken || TOKEN_ADDRESS;
    console.log('Using token address:', tokenAddress);
    
    try {
      writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, stakeAmountBigInt],
      });
      toast.success('Approval initiated!');
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to initiate approval');
    }
  };

 
  const handleStake = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first!');
      return;
    }
    if (!stakeAmount || isNaN(parseFloat(stakeAmount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    const stakeAmountBigInt = parseEther(stakeAmount);
    console.log('stakeAmountBigInt:', stakeAmountBigInt.toString());
    
    
    if (tokenBalance && stakeAmountBigInt > tokenBalance) {
      console.log('Insufficient balance check failed');
      toast.error('Insufficient token balance');
      return;
    }
    
    if (tokenAllowance && stakeAmountBigInt > tokenAllowance) {
      console.log('Insufficient allowance check failed');
      toast.error('Please approve tokens first');
      return;
    }
    
    console.log('All checks passed, calling writeContract...');
    
    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: stakingAbi,
        functionName: 'stake',
        args: [stakeAmountBigInt],
      });
      toast.success('Staking initiated!');
      setStakeAmount('');
    } catch (error) {
      console.error('Staking error:', error);
      toast.error('Failed to initiate staking');
    }
  };

  
  const handleWithdraw = () => {
    if (!isConnected) {
      toast({ title: 'Please connect your wallet first!' });
      return;
    }
    if (!withdrawAmount || isNaN(parseFloat(withdrawAmount))) {
      toast({ title: 'Error', description: 'Please enter a valid amount', variant: 'error' });
      return;
    }
    if (!finalCanWithdraw) {
      toast({ title: 'Error', description: 'Lock duration not met', variant: 'error' });
      return;
    }
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: stakingAbi,
      functionName: 'withdraw',
      args: [parseEther(withdrawAmount)],
    });
    toast({ title: 'Withdrawal initiated!' });
    setWithdrawAmount('');
  };

  
  const handleClaim = () => {
    if (!isConnected) {
      toast({ title: 'Please connect your wallet first!' });
      return;
    }
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: stakingAbi,
      functionName: 'claimRewards',
    });
    toast({ title: 'Rewards claim initiated!' });
  };


  const handleEmergencyWithdraw = () => {
    if (!isConnected) {
      toast({ title: 'Please connect your wallet first!' });
      return;
    }
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: stakingAbi,
      functionName: 'emergencyWithdraw',
    });
    toast({ title: 'Emergency withdrawal initiated!' });
  };

 
  React.useEffect(() => {
    if (isTransactionSuccess) {
      toast.success('Transaction completed successfully!');
      
      setTimeout(async () => {
        await Promise.all([
          refetchUserDetails(),
          refetchTokenBalance(),
          refetchTokenAllowance(),
          refetchTotalStaked()
        ]);
        toast.success('Data updated successfully!');
      }, 1500);
    }
  }, [isTransactionSuccess, refetchUserDetails, refetchTokenBalance, refetchTokenAllowance, refetchTotalStaked]);

  React.useEffect(() => {
    if (writeError) {
      console.error('Transaction error:', writeError);
      toast.error(writeError.message || 'Transaction failed');
    }
  }, [writeError]);

 
  React.useEffect(() => {
    if (receiptError) {
      console.error('Receipt error:', receiptError);
      toast.error('Transaction failed to confirm');
    }
  }, [receiptError]);

  React.useEffect(() => {
    if (!isConnected || !address) return;

    const interval = setInterval(async () => {
      try {
        await refetchUserDetails();
      } catch (error) {
        console.error('Failed to refresh user details:', error);
      }
    }, 30000); 

    return () => clearInterval(interval);
  }, [isConnected, address, refetchUserDetails]);

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
          stakedBalance={finalStakedBalance}
          pendingRewards={finalPendingRewards}
          timeUntilUnlock={finalTimeUntilUnlock}
        />

        {isConnected && (
          <>

            <StakingForm 
              isConnected={isConnected}
              stakeAmount={stakeAmount}
              setStakeAmount={setStakeAmount}
              handleApprove={handleApprove}
              handleStake={handleStake}
              isStakingPending={isStakingPending || isWritePending}
              tokenBalance={tokenBalance}
              tokenAllowance={tokenAllowance}
            />

            <WithdrawForm 
              isConnected={isConnected}
              withdrawAmount={withdrawAmount}
              setWithdrawAmount={setWithdrawAmount}
              handleWithdraw={handleWithdraw}
              canWithdraw={finalCanWithdraw}
            />

            <RewardsClaim 
              isConnected={isConnected}
              pendingRewards={finalPendingRewards}
              handleClaim={handleClaim}
            />

            <EmergencyWithdraw 
              isConnected={isConnected}
              handleEmergencyWithdraw={handleEmergencyWithdraw}
            />

          </>
        )}
        
        <ProtocolStats 
          apr={apr}
          totalStaked={totalStaked}
          totalRewards={totalRewards}
          currentRewardRate={currentRewardRate}
        />
      </div>
      <Toaster />
    </div>
  );
}

export default App;