import { useCallback, useState } from "react";
import { useEffect } from "react";
import {
    useAccount,
    usePublicClient,
    useWalletClient,
    useWriteContract,
} from "wagmi";
import { stakingAbi } from "../config/ABI";
import { erc20Abi } from "../config/ERC20";
import { toast } from "sonner";
import { parseEther, formatEther } from "viem";

const stakingContractConfig = {
    address: import.meta.env.VITE_STAKING_CONTRACT_ADDRESS,
    abi: stakingAbi,
};

const TOKEN_ADDRESS = '0xefec53fa6759fcdd49c3e084b69286a8967c7db2';

const useStaking = () => {
    const [userStakingData, setUserStakingData] = useState({
        stakedBalance: 0n,
        pendingRewards: 0n,
        timeUntilUnlock: 0,
        canWithdraw: false,
        tokenBalance: 0n,
        tokenAllowance: 0n,
    });
    const [protocolStats, setProtocolStats] = useState({
        apr: 0n,
        currentRewardRate: 0n,
        totalStaked: 0n,
        totalRewards: 0n,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [stakingToken, setStakingToken] = useState();
    const [refreshInterval, setRefreshInterval] = useState(null);

    const publicClient = usePublicClient();
    const walletClient = useWalletClient();
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();

    useEffect(() => {
        (async () => {
            if (!publicClient) return;

            try {
                console.log('Loading contract data...', {
                    contractAddress: stakingContractConfig.address,
                    publicClient: !!publicClient,
                    address: address,
                    chainId: publicClient.chain?.id
                });

                const contractCode = await publicClient.getBytecode({
                    address: stakingContractConfig.address
                });
                
                if (!contractCode || contractCode === '0x') {
                    throw new Error(`No contract found at address ${stakingContractConfig.address}. Please verify the contract is deployed on Sepolia testnet.`);
                }

                console.log('Contract exists, bytecode length:', contractCode.length);

                let stakingTokenAddress;
                try {
                    stakingTokenAddress = await publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: "stakingToken",
                    });
                    console.log('Staking token address:', stakingTokenAddress);
                    setStakingToken(stakingTokenAddress);
                } catch (tokenError) {
                    console.error('Failed to get staking token address:', tokenError);
                    stakingTokenAddress = TOKEN_ADDRESS;
                    setStakingToken(TOKEN_ADDRESS);
                    console.log('Using fallback token address:', TOKEN_ADDRESS);
                }

                const [apr, currentRewardRate, totalStaked, totalRewards, minLockDuration, aprReductionPerThousand, emergencyWithdrawPenalty, totalRewardsDistributed] = await Promise.allSettled([
                    publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'initialApr',
                    }),
                    publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'currentRewardRate',
                    }),
                    publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'totalStaked',
                    }),
                    publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'getTotalRewards',
                    }),
                    publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'minLockDuration',
                    }),
                    publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'aprReductionPerThousand',
                    }),
                    publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'emergencyWithdrawPenalty',
                    }),
                    publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'totalRewardsDistributed',
                    }).catch(() => ({ status: 'rejected', reason: 'Function not found' })),
                ]);

                console.log('Protocol stats results:', { apr, currentRewardRate, totalStaked, totalRewards });

                console.log('Protocol stats breakdown:', {
                    apr: apr.status === 'fulfilled' ? apr.value?.toString() : `Error: ${apr.reason}`,
                    currentRewardRate: currentRewardRate.status === 'fulfilled' ? currentRewardRate.value?.toString() : `Error: ${currentRewardRate.reason}`,
                    totalStaked: totalStaked.status === 'fulfilled' ? totalStaked.value?.toString() : `Error: ${totalStaked.reason}`,
                    totalRewards: totalRewards.status === 'fulfilled' ? totalRewards.value?.toString() : `Error: ${totalRewards.reason}`,
                    minLockDuration: minLockDuration.status === 'fulfilled' ? minLockDuration.value?.toString() : `Error: ${minLockDuration.reason}`,
                    aprReductionPerThousand: aprReductionPerThousand.status === 'fulfilled' ? aprReductionPerThousand.value?.toString() : `Error: ${aprReductionPerThousand.reason}`,
                    emergencyWithdrawPenalty: emergencyWithdrawPenalty.status === 'fulfilled' ? emergencyWithdrawPenalty.value?.toString() : `Error: ${emergencyWithdrawPenalty.reason}`,
                });

                console.log('Contract Deployment Parameters:', {
                    _aprReductionPerThousand: aprReductionPerThousand.status === 'fulfilled' ? aprReductionPerThousand.value?.toString() : 'Failed to fetch',
                    _emergencyWithdrawPenalty: emergencyWithdrawPenalty.status === 'fulfilled' ? emergencyWithdrawPenalty.value?.toString() : 'Failed to fetch'
                });

                console.log('Total Rewards Debug:', {
                    getTotalRewardsResult: totalRewards.status === 'fulfilled' ? totalRewards.value?.toString() : `Error: ${totalRewards.reason}`,
                    getTotalRewardsTokens: totalRewards.status === 'fulfilled' ? Number(totalRewards.value || 0n) / 1e18 : 0,
                    totalRewardsDistributedResult: totalRewardsDistributed.status === 'fulfilled' ? totalRewardsDistributed.value?.toString() : `Error: ${totalRewardsDistributed.reason}`,
                    note: 'This should show cumulative rewards distributed to all users'
                });

                const totalStakedAmount = Number(totalStaked.status === 'fulfilled' ? totalStaked.value || 0n : 0n);
                const aprPercent = Number(apr.status === 'fulfilled' ? apr.value || 0n : 0n);
                
                const defaultStakingTime = 3600;
                
                const estimatedTotalRewards = totalStakedAmount > 0 && aprPercent > 0 
                    ? (totalStakedAmount * aprPercent * defaultStakingTime) / (365 * 24 * 60 * 60 * 100)
                    : 0;

                console.log('Total Rewards Estimation:', {
                    totalStakedWei: totalStakedAmount,
                    totalStakedTokens: totalStakedAmount / 1e18,
                    aprPercent: aprPercent,
                    defaultStakingTimeHours: defaultStakingTime / 3600,
                    estimatedTotalRewardsWei: estimatedTotalRewards,
                    estimatedTotalRewardsTokens: estimatedTotalRewards / 1e18,
                    note: 'Initial calculation - will be updated dynamically'
                });

                const contractTotalRewards = totalRewards.status === 'fulfilled' ? totalRewards.value || 0n : 0n;
                const fallbackTotalRewards = contractTotalRewards === 0n && estimatedTotalRewards > 0 
                    ? BigInt(Math.floor(estimatedTotalRewards))
                    : contractTotalRewards;

                console.log('Total Rewards Final Decision:', {
                    contractReturned: contractTotalRewards.toString(),
                    estimatedRewards: estimatedTotalRewards.toString(),
                    usingFallback: contractTotalRewards === 0n && estimatedTotalRewards > 0,
                    finalValue: fallbackTotalRewards.toString()
                });

                setProtocolStats({
                    apr: apr.status === 'fulfilled' ? apr.value || 0n : 0n,
                    currentRewardRate: currentRewardRate.status === 'fulfilled' ? currentRewardRate.value || 0n : 0n,
                    totalStaked: totalStaked.status === 'fulfilled' ? totalStaked.value || 0n : 0n,
                    totalRewards: fallbackTotalRewards,
                });

                if (!address) return;

                const userDetails = await publicClient.readContract({
                    ...stakingContractConfig,
                    functionName: 'getUserDetails',
                    args: [address],
                });

                console.log('Raw user details from contract:', userDetails);
                console.log('User details breakdown:', {
                    stakedAmount: userDetails?.stakedAmount?.toString(),
                    lastStakeTimestamp: userDetails?.lastStakeTimestamp?.toString(),
                    pendingRewards: userDetails?.pendingRewards?.toString(),
                    timeUntilUnlock: userDetails?.timeUntilUnlock?.toString(),
                    canWithdraw: userDetails?.canWithdraw
                });

                const currentTimeForRewards = Math.floor(Date.now() / 1000);
                const lastStakeTimeForRewards = Number(userDetails?.lastStakeTimestamp || 0);
                const stakedAmount = Number(userDetails?.stakedAmount || 0n);
                const timeSinceStakeForRewards = currentTimeForRewards - lastStakeTimeForRewards;
                const aprValue = Number(apr.status === 'fulfilled' ? apr.value || 0n : 0n);
                
                const expectedRewards = stakedAmount > 0 && aprValue > 0 && timeSinceStakeForRewards > 0 
                    ? (stakedAmount * aprValue * timeSinceStakeForRewards) / (365 * 24 * 60 * 60 * 100)
                    : 0;

                console.log('Reward calculation analysis:', {
                    stakedAmountWei: stakedAmount,
                    stakedAmountTokens: stakedAmount / 1e18,
                    aprPercent: aprValue,
                    timeSinceStakeSeconds: timeSinceStakeForRewards,
                    timeSinceStakeMinutes: Math.floor(timeSinceStakeForRewards / 60),
                    timeSinceStakeHours: Math.floor(timeSinceStakeForRewards / 3600),
                    expectedRewardsWei: expectedRewards,
                    expectedRewardsTokens: expectedRewards / 1e18,
                    contractPendingRewards: Number(userDetails?.pendingRewards || 0n) / 1e18
                });

                try {
                    const directPendingRewards = await publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'getPendingRewards',
                        args: [address],
                    });
                    console.log('Direct pending rewards call:', directPendingRewards?.toString());
                } catch (pendingError) {
                    console.log('Direct pending rewards call failed:', pendingError);
                }

                let contractTimeUntilUnlock = 0;
                try {
                    const directTimeUntilUnlock = await publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'getTimeUntilUnlock',
                        args: [address],
                    });
                    contractTimeUntilUnlock = Number(directTimeUntilUnlock || 0);
                    console.log('Direct getTimeUntilUnlock call:', contractTimeUntilUnlock);
                } catch (timeError) {
                    console.log('Direct getTimeUntilUnlock call failed:', timeError);
                }

                const tokenBalance = await publicClient.readContract({
                    address: stakingTokenAddress || TOKEN_ADDRESS,
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [address],
                });

                const tokenAllowance = await publicClient.readContract({
                    address: stakingTokenAddress || TOKEN_ADDRESS,
                    abi: erc20Abi,
                    functionName: 'allowance',
                    args: [address, stakingContractConfig.address],
                });

                const currentTime = Math.floor(Date.now() / 1000);
                const lastStakeTime = Number(userDetails?.lastStakeTimestamp || 0);
                const timeSinceStake = currentTime - lastStakeTime;
                const minLockDurationSeconds = Number(minLockDuration.status === 'fulfilled' ? minLockDuration.value || 0n : 0n);
                
                const unlockTime = lastStakeTime + minLockDurationSeconds;
                const timeUntilUnlockCalculated = Math.max(0, unlockTime - currentTime);
                
                const finalTimeUntilUnlock = (minLockDurationSeconds === 0 || contractTimeUntilUnlock > 0) 
                    ? contractTimeUntilUnlock 
                    : timeUntilUnlockCalculated;
                
                const canWithdrawFromContract = userDetails?.canWithdraw || false;
                const canWithdrawCalculated = finalTimeUntilUnlock === 0 && Number(userDetails?.stakedAmount || 0n) > 0;
                
                console.log('Timing analysis:', {
                    currentTimestamp: currentTime,
                    lastStakeTimestamp: lastStakeTime,
                    minLockDurationSeconds: minLockDurationSeconds,
                    minLockDurationHours: Math.floor(minLockDurationSeconds / 3600),
                    minLockDurationDays: Math.floor(minLockDurationSeconds / 86400),
                    unlockTimestamp: unlockTime,
                    timeSinceStakeSeconds: timeSinceStake,
                    timeSinceStakeMinutes: Math.floor(timeSinceStake / 60),
                    timeSinceStakeHours: Math.floor(timeSinceStake / 3600),
                    timeUntilUnlockSeconds: timeUntilUnlockCalculated,
                    timeUntilUnlockMinutes: Math.floor(timeUntilUnlockCalculated / 60),
                    timeUntilUnlockHours: Math.floor(timeUntilUnlockCalculated / 3600),
                    timeUntilUnlockDays: Math.floor(timeUntilUnlockCalculated / 86400),
                    contractTimeUntilUnlock: contractTimeUntilUnlock,
                    contractTimeUntilUnlockHours: Math.floor(contractTimeUntilUnlock / 3600),
                    contractTimeUntilUnlockDays: Math.floor(contractTimeUntilUnlock / 86400),
                    finalTimeUntilUnlock: finalTimeUntilUnlock,
                    finalTimeUntilUnlockHours: Math.floor(finalTimeUntilUnlock / 3600),
                    finalTimeUntilUnlockDays: Math.floor(finalTimeUntilUnlock / 86400),
                    canWithdrawCalculated: canWithdrawCalculated,
                    canWithdrawFromContract: canWithdrawFromContract,
                    contractCanWithdraw: userDetails?.canWithdraw,
                    finalCanWithdraw: canWithdrawFromContract || canWithdrawCalculated,
                    minLockDurationRaw: minLockDuration.status === 'fulfilled' ? minLockDuration.value?.toString() : 'Failed to fetch'
                });

                setUserStakingData({
                    stakedBalance: userDetails?.stakedAmount || 0n,
                    pendingRewards: userDetails?.pendingRewards || 0n,
                    timeUntilUnlock: finalTimeUntilUnlock,
                    canWithdraw: canWithdrawFromContract || canWithdrawCalculated,
                    tokenBalance: tokenBalance || 0n,
                    tokenAllowance: tokenAllowance || 0n,
                });
            } catch (error) {
                console.error('Error fetching contract data:', error);
                
                let errorMessage = 'Failed to load contract data';
                if (error.message) {
                    if (error.message.includes('network')) {
                        errorMessage = 'Network connection error - check your RPC';
                    } else if (error.message.includes('contract')) {
                        errorMessage = 'Contract not found - check address and network';
                    } else if (error.message.includes('function')) {
                        errorMessage = 'Contract function not found - ABI mismatch';
                    } else if (error.message.includes('revert')) {
                        errorMessage = 'Contract call reverted - contract may be paused';
                    } else {
                        errorMessage = `Contract error: ${error.message}`;
                    }
                }
                
                toast.error(errorMessage, {
                    description: 'Please check console for details'
                });
            }
        })();
    }, [address, publicClient]);

    useEffect(() => {
        if (!publicClient || !address) return;

        const unsubscribeStaked = publicClient.watchContractEvent({
            ...stakingContractConfig,
            eventName: 'Staked',
            onLogs: (logs) => {
                logs.forEach((log) => {
                   
                    setProtocolStats(prev => ({
                        ...prev,
                        totalStaked: log.args.newTotalStaked || (prev.totalStaked + log.args.amount),
                    }));
                    
                    
                    if (log.args.user?.toLowerCase() === address.toLowerCase()) {
                        toast.success('Staking successful!', {
                            description: `Successfully staked ${formatEther(log.args.amount)} STK`,
                        });
                        
                        setUserStakingData(prev => ({
                            ...prev,
                            stakedBalance: prev.stakedBalance + log.args.amount,
                            canWithdraw: false,
                        }));
                    }
                });
            },
        });

        const unsubscribeWithdrawn = publicClient.watchContractEvent({
            ...stakingContractConfig,
            eventName: 'Withdrawn',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    setProtocolStats(prev => ({
                        ...prev,
                        totalStaked: log.args.newTotalStaked || (prev.totalStaked - log.args.amount),
                    }));
                    
                    if (log.args.user?.toLowerCase() === address.toLowerCase()) {
                        toast.success('Withdrawal successful!', {
                            description: `Successfully withdrew ${formatEther(log.args.amount)} STK with ${formatEther(log.args.rewardsAccrued || 0n)} rewards`,
                        });
                        setUserStakingData(prev => ({
                            ...prev,
                            stakedBalance: prev.stakedBalance - log.args.amount,
                            pendingRewards: 0n,
                        }));
                    }
                });
            },
        });

        const unsubscribeRewardsClaimed = publicClient.watchContractEvent({
            ...stakingContractConfig,
            eventName: 'RewardsClaimed',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    if (log.args.user?.toLowerCase() === address.toLowerCase()) {
                        toast.success('Rewards claimed!', {
                            description: `Successfully claimed ${formatEther(log.args.amount)} STK`,
                        });
                        setUserStakingData(prev => ({
                            ...prev,
                            pendingRewards: 0n,
                        }));
                    }
                });
            },
        });

        const unsubscribeEmergencyWithdrawn = publicClient.watchContractEvent({
            ...stakingContractConfig,
            eventName: 'EmergencyWithdrawn',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    setProtocolStats(prev => ({
                        ...prev,
                        totalStaked: log.args.newTotalStaked,
                    }));
                    
                    if (log.args.user?.toLowerCase() === address.toLowerCase()) {
                        toast.warning('Emergency withdrawal completed', {
                            description: `Withdrew ${formatEther(log.args.amount)} STK with ${formatEther(log.args.penalty || 0n)} penalty`,
                        });
                        setUserStakingData(prev => ({
                            ...prev,
                            stakedBalance: 0n,
                            pendingRewards: 0n,
                            canWithdraw: false,
                        }));
                    }
                });
            },
        });

        const unsubscribeRewardRateUpdated = publicClient.watchContractEvent({
            ...stakingContractConfig,
            eventName: 'RewardRateUpdated',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    toast.info('Reward rate updated', {
                        description: `New rate: ${(Number(log.args.newRate) / 100).toFixed(2)}%`,
                    });
                    setProtocolStats(prev => ({
                        ...prev,
                        currentRewardRate: log.args.newRate,
                    }));
                });
            },
        });

        return () => {
            unsubscribeStaked();
            unsubscribeWithdrawn();
            unsubscribeRewardsClaimed();
            unsubscribeEmergencyWithdrawn();
            unsubscribeRewardRateUpdated();
        };
    }, [address, publicClient]);

    useEffect(() => {
        if (!address || !publicClient) return;

        const refreshUserData = async () => {
            try {
                const userDetails = await publicClient.readContract({
                    ...stakingContractConfig,
                    functionName: 'getUserDetails',
                    args: [address],
                });

                const directPendingRewards = await publicClient.readContract({
                    ...stakingContractConfig,
                    functionName: 'getPendingRewards',
                    args: [address],
                });

                const [totalStakedResult, totalRewardsResult] = await Promise.allSettled([
                    publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'totalStaked',
                    }),
                    publicClient.readContract({
                        ...stakingContractConfig,
                        functionName: 'getTotalRewards',
                    })
                ]);

                const protocolTotalStaked = totalStakedResult.status === 'fulfilled' ? totalStakedResult.value || 0n : protocolStats.totalStaked;
                const protocolTotalRewards = totalRewardsResult.status === 'fulfilled' ? totalRewardsResult.value || 0n : protocolStats.totalRewards;

                console.log('Periodic refresh:', {
                    pendingRewards: directPendingRewards?.toString(),
                    protocolTotalStaked: protocolTotalStaked.toString(),
                    protocolTotalRewards: protocolTotalRewards.toString(),
                    timestamp: new Date().toLocaleTimeString()
                });

                setUserStakingData(prev => ({
                    ...prev,
                    pendingRewards: directPendingRewards || userDetails?.pendingRewards || 0n,
                }));

                setProtocolStats(prev => ({
                    ...prev,
                    totalStaked: protocolTotalStaked,
                    totalRewards: protocolTotalRewards,
                }));

            } catch (error) {
                console.error('Error refreshing user data:', error);
            }
        };

        const interval = setInterval(refreshUserData, 10000);
        setRefreshInterval(interval);

        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [address, publicClient]);

 
    const approveTokens = useCallback(
        async (amount) => {
            if (!address || !walletClient) {
                toast.error('Please connect your wallet first!');
                return false;
            }

            if (!amount || isNaN(parseFloat(amount))) {
                toast.error('Please enter a valid amount');
                return false;
            }

            try {
                const amountBigInt = parseEther(amount);
                
                if (userStakingData.tokenBalance && amountBigInt > userStakingData.tokenBalance) {
                    toast.error('Insufficient token balance');
                    return false;
                }

                const tokenAddress = stakingToken || TOKEN_ADDRESS;

                const hash = await writeContractAsync({
                    address: tokenAddress,
                    abi: erc20Abi,
                    functionName: 'approve',
                    args: [stakingContractConfig.address, amountBigInt],
                });

                const receipt = await publicClient.waitForTransactionReceipt({ hash });

                if (receipt.status === 'success') {
                    const newAllowance = await publicClient.readContract({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'allowance',
                        args: [address, stakingContractConfig.address],
                    });
                    
                    setUserStakingData(prev => ({
                        ...prev,
                        tokenAllowance: newAllowance,
                    }));
                    
                    toast.success('Token approval successful!', {
                        description: 'You can now stake your STK',
                    });
                    return true;
                } else {
                    toast.error('Token approval failed');
                    return false;
                }
            } catch (error) {
                console.error('Approval error:', error);
                toast.error('Failed to approve STK', {
                    description: error.message || 'Transaction failed',
                });
                return false;
            }
        },
        [address, walletClient, userStakingData.tokenBalance, stakingToken, writeContractAsync, publicClient]
    );

  
    const stakeTokens = useCallback(
        async (amount) => {
            if (!address || !walletClient) {
                toast.error('Please connect your wallet first!');
                return false;
            }

            if (!amount || isNaN(parseFloat(amount))) {
                toast.error('Please enter a valid amount');
                return false;
            }

            try {
                const amountBigInt = parseEther(amount);

                if (userStakingData.tokenBalance && amountBigInt > userStakingData.tokenBalance) {
                    toast.error('Insufficient token balance');
                    return false;
                }

                if (userStakingData.tokenAllowance && amountBigInt > userStakingData.tokenAllowance) {
                    toast.error('Please approve STK first');
                    return false;
                }

                console.log('Attempting to stake:', {
                    amount: amountBigInt.toString(),
                    contract: stakingContractConfig.address,
                    balance: userStakingData.tokenBalance?.toString(),
                    allowance: userStakingData.tokenAllowance?.toString()
                });

                const hash = await writeContractAsync({
                    ...stakingContractConfig,
                    functionName: 'stake',
                    args: [amountBigInt],
                });

                console.log('Staking transaction hash:', hash);

                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                console.log('Staking transaction receipt:', receipt);

                if (receipt.status === 'success') {
                    toast.success('Staking transaction confirmed!', {
                        description: `Successfully staked ${amount} STK`,
                    });
                    
                    setTimeout(async () => {
                        try {
                            const userDetails = await publicClient.readContract({
                                ...stakingContractConfig,
                                functionName: 'getUserDetails',
                                args: [address],
                            });
                            
                            setUserStakingData(prev => ({
                                ...prev,
                                stakedBalance: userDetails?.stakedAmount || prev.stakedBalance,
                                pendingRewards: userDetails?.pendingRewards || prev.pendingRewards,
                                timeUntilUnlock: Number(userDetails?.timeUntilUnlock || 0),
                                canWithdraw: userDetails?.canWithdraw || false,
                            }));
                        } catch (error) {
                            console.error('Error refreshing user data:', error);
                        }
                    }, 2000);
                    
                    return true;
                } else {
                    toast.error('Staking transaction failed', {
                        description: `Transaction status: ${receipt.status}`,
                    });
                    return false;
                }
            } catch (error) {
                console.error('Staking error:', error);
                
                let errorMessage = 'Transaction failed';
                if (error.message) {
                    if (error.message.includes('EnforcedPause')) {
                        errorMessage = 'Staking is currently paused';
                    } else if (error.message.includes('Insufficient balance')) {
                        errorMessage = 'Insufficient token balance';
                    } else if (error.message.includes('Transfer failed')) {
                        errorMessage = 'Token transfer failed - check allowance';
                    } else if (error.message.includes('Lock duration')) {
                        errorMessage = 'Previous stake still locked';
                    } else if (error.message.includes('user rejected')) {
                        errorMessage = 'Transaction rejected by user';
                    } else {
                        errorMessage = error.message;
                    }
                }
                
                toast.error('Failed to stake STK', {
                    description: errorMessage,
                });
                return false;
            }
        },
        [address, walletClient, userStakingData.tokenBalance, userStakingData.tokenAllowance, writeContractAsync, publicClient]
    );

    const withdrawTokens = useCallback(
        async (amount) => {
            if (!address || !walletClient) {
                toast.error('Please connect your wallet first!');
                return false;
            }

            if (!amount || isNaN(parseFloat(amount))) {
                toast.error('Please enter a valid amount');
                return false;
            }

            console.log('Withdraw attempt - checking conditions:', {
                canWithdraw: userStakingData.canWithdraw,
                timeUntilUnlock: userStakingData.timeUntilUnlock,
                stakedBalance: userStakingData.stakedBalance?.toString(),
                requestedAmount: amount
            });

            if (!userStakingData.canWithdraw) {
                toast.error(`Lock duration not met. Time until unlock: ${userStakingData.timeUntilUnlock} seconds`);
                return false;
            }

            try {
                const amountBigInt = parseEther(amount);

                const hash = await writeContractAsync({
                    ...stakingContractConfig,
                    functionName: 'withdraw',
                    args: [amountBigInt],
                });

                const receipt = await publicClient.waitForTransactionReceipt({ hash });

                if (receipt.status === 'success') {
                    toast.success('Withdrawal initiated!', {
                        description: `Withdrawing ${amount} STK`,
                    });
                    return true;
                } else {
                    toast.error('Withdrawal failed');
                    return false;
                }
            } catch (error) {
                console.error('Withdrawal error:', error);
                toast.error('Failed to withdraw STK', {
                    description: error.message || 'Transaction failed',
                });
                return false;
            }
        },
        [address, walletClient, userStakingData.canWithdraw, writeContractAsync, publicClient]
    );

    const claimRewards = useCallback(
        async () => {
            if (!address || !walletClient) {
                toast.error('Please connect your wallet first!');
                return false;
            }

            try {
                const hash = await writeContractAsync({
                    ...stakingContractConfig,
                    functionName: 'claimRewards',
                });

                const receipt = await publicClient.waitForTransactionReceipt({ hash });

                if (receipt.status === 'success') {
                    toast.success('Rewards claim initiated!');
                    return true;
                } else {
                    toast.error('Rewards claim failed');
                    return false;
                }
            } catch (error) {
                console.error('Claim rewards error:', error);
                toast.error('Failed to claim rewards', {
                    description: error.message || 'Transaction failed',
                });
                return false;
            }
        },
        [address, walletClient, writeContractAsync, publicClient]
    );

  
    const emergencyWithdraw = useCallback(
        async () => {
            if (!address || !walletClient) {
                toast.error('Please connect your wallet first!');
                return false;
            }

            try {
                const hash = await writeContractAsync({
                    ...stakingContractConfig,
                    functionName: 'emergencyWithdraw',
                });

                const receipt = await publicClient.waitForTransactionReceipt({ hash });

                if (receipt.status === 'success') {
                    toast.success('Emergency withdrawal initiated!');
                    return true;
                } else {
                    toast.error('Emergency withdrawal failed');
                    return false;
                }
            } catch (error) {
                console.error('Emergency withdrawal error:', error);
                toast.error('Failed to emergency withdraw', {
                    description: error.message || 'Transaction failed',
                });
                return false;
            }
        },
        [address, walletClient, writeContractAsync, publicClient]
    );

    return {
        userStakingData,
        protocolStats,
        isLoading,
        approveTokens,
        stakeTokens,
        withdrawTokens,
        claimRewards,
        emergencyWithdraw,
    };
};

export default useStaking;
