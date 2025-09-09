import { useCallback, useState, useEffect } from "react";
import {
    useAccount,
    usePublicClient,
    useWalletClient,
    useWriteContract,
    useReadContract,
} from "wagmi";
import { toast } from "sonner";
import { parseEther, formatEther } from "viem";
import { stakingAbi } from "../config/ABI";
import { erc20Abi } from "../config/ERC20";

const CONTRACT_ADDRESS = '0xd9145CCE52D386f254917e481eB44e9943F39138';
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

    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();

    // Get staking token address
    const { data: stakingToken } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: stakingAbi,
        functionName: 'stakingToken',
    });

    // Fetch user staking details
    const fetchUserStakingData = useCallback(async () => {
        if (!publicClient || !address) return;

        try {
            setIsLoading(true);

            // Get user details from contract
            const userDetails = await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: stakingAbi,
                functionName: 'getUserDetails',
                args: [address],
            });

            // Get token balance
            const tokenBalance = await publicClient.readContract({
                address: stakingToken || TOKEN_ADDRESS,
                abi: erc20Abi,
                functionName: 'balanceOf',
                args: [address],
            });

            // Get token allowance
            const tokenAllowance = await publicClient.readContract({
                address: stakingToken || TOKEN_ADDRESS,
                abi: erc20Abi,
                functionName: 'allowance',
                args: [address, CONTRACT_ADDRESS],
            });

            setUserStakingData({
                stakedBalance: userDetails?.stakedAmount || 0n,
                pendingRewards: userDetails?.pendingRewards || 0n,
                timeUntilUnlock: userDetails?.timeUntilUnlock || 0,
                canWithdraw: userDetails?.canWithdraw || false,
                tokenBalance: tokenBalance || 0n,
                tokenAllowance: tokenAllowance || 0n,
            });
        } catch (error) {
            console.error('Error fetching user staking data:', error);
            toast.error('Failed to fetch staking data');
        } finally {
            setIsLoading(false);
        }
    }, [address, publicClient, stakingToken]);

    // Fetch protocol statistics
    const fetchProtocolStats = useCallback(async () => {
        if (!publicClient) return;

        try {
            const [apr, currentRewardRate, totalStaked, totalRewards] = await Promise.all([
                publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: stakingAbi,
                    functionName: 'initialApr',
                }),
                publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: stakingAbi,
                    functionName: 'currentRewardRate',
                }),
                publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: stakingAbi,
                    functionName: 'totalStaked',
                }),
                publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: stakingAbi,
                    functionName: 'getTotalRewards',
                }),
            ]);

            setProtocolStats({
                apr: apr || 0n,
                currentRewardRate: currentRewardRate || 0n,
                totalStaked: totalStaked || 0n,
                totalRewards: totalRewards || 0n,
            });
        } catch (error) {
            console.error('Error fetching protocol stats:', error);
        }
    }, [publicClient]);


    useEffect(() => {
        fetchUserStakingData();
        fetchProtocolStats();
    }, [fetchUserStakingData, fetchProtocolStats]);

    useEffect(() => {
        if (!publicClient || !address) return;

        const unsubscribeStaked = publicClient.watchContractEvent({
            address: CONTRACT_ADDRESS,
            abi: stakingAbi,
            eventName: 'Staked',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    if (log.args.user?.toLowerCase() === address.toLowerCase()) {
                        toast.success('Staking successful!', {
                            description: `Successfully staked ${formatEther(log.args.amount)} tokens`,
                        });
                        fetchUserStakingData();
                        fetchProtocolStats();
                    }
                });
            },
        });

        const unsubscribeWithdrawn = publicClient.watchContractEvent({
            address: CONTRACT_ADDRESS,
            abi: stakingAbi,
            eventName: 'Withdrawn',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    if (log.args.user?.toLowerCase() === address.toLowerCase()) {
                        toast.success('Withdrawal successful!', {
                            description: `Successfully withdrew ${formatEther(log.args.amount)} tokens with ${formatEther(log.args.rewardsAccrued || 0n)} rewards`,
                        });
                        fetchUserStakingData();
                        fetchProtocolStats();
                    }
                });
            },
        });

        const unsubscribeRewardsClaimed = publicClient.watchContractEvent({
            address: CONTRACT_ADDRESS,
            abi: stakingAbi,
            eventName: 'RewardsClaimed',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    if (log.args.user?.toLowerCase() === address.toLowerCase()) {
                        toast.success('Rewards claimed!', {
                            description: `Successfully claimed ${formatEther(log.args.amount)} tokens`,
                        });
                        fetchUserStakingData();
                    }
                });
            },
        });

        const unsubscribeEmergencyWithdrawn = publicClient.watchContractEvent({
            address: CONTRACT_ADDRESS,
            abi: stakingAbi,
            eventName: 'EmergencyWithdrawn',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    if (log.args.user?.toLowerCase() === address.toLowerCase()) {
                        toast.warning('Emergency withdrawal completed', {
                            description: `Withdrew ${formatEther(log.args.amount)} tokens with ${formatEther(log.args.penalty || 0n)} penalty`,
                        });
                        fetchUserStakingData();
                        fetchProtocolStats();
                    }
                });
            },
        });

        const unsubscribeRewardRateUpdated = publicClient.watchContractEvent({
            address: CONTRACT_ADDRESS,
            abi: stakingAbi,
            eventName: 'RewardRateUpdated',
            onLogs: (logs) => {
                logs.forEach((log) => {
                    toast.info('Reward rate updated', {
                        description: `New rate: ${(Number(log.args.newRate) / 100).toFixed(2)}%`,
                    });
                    fetchProtocolStats();
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
    }, [address, publicClient, fetchUserStakingData, fetchProtocolStats]);


    useEffect(() => {
        if (!address) return;

        const interval = setInterval(() => {
            fetchUserStakingData();
        }, 30000); 
        return () => clearInterval(interval);
    }, [address, fetchUserStakingData]);

 
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
                    args: [CONTRACT_ADDRESS, amountBigInt],
                });

                const receipt = await publicClient.waitForTransactionReceipt({ hash });

                if (receipt.status === 'success') {
                    toast.success('Token approval successful!', {
                        description: 'You can now stake your tokens',
                    });
                    await fetchUserStakingData(); // Refresh allowance
                    return true;
                } else {
                    toast.error('Token approval failed');
                    return false;
                }
            } catch (error) {
                console.error('Approval error:', error);
                toast.error('Failed to approve tokens', {
                    description: error.message || 'Transaction failed',
                });
                return false;
            }
        },
        [address, walletClient, userStakingData.tokenBalance, stakingToken, writeContractAsync, publicClient, fetchUserStakingData]
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
                    toast.error('Please approve tokens first');
                    return false;
                }

                const hash = await writeContractAsync({
                    address: CONTRACT_ADDRESS,
                    abi: stakingAbi,
                    functionName: 'stake',
                    args: [amountBigInt],
                });

                const receipt = await publicClient.waitForTransactionReceipt({ hash });

                if (receipt.status === 'success') {
                    toast.success('Staking initiated!', {
                        description: `Staking ${amount} tokens`,
                    });
                    return true;
                } else {
                    toast.error('Staking failed');
                    return false;
                }
            } catch (error) {
                console.error('Staking error:', error);
                toast.error('Failed to stake tokens', {
                    description: error.message || 'Transaction failed',
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

            if (!userStakingData.canWithdraw) {
                toast.error('Lock duration not met');
                return false;
            }

            try {
                const amountBigInt = parseEther(amount);

                const hash = await writeContractAsync({
                    address: CONTRACT_ADDRESS,
                    abi: stakingAbi,
                    functionName: 'withdraw',
                    args: [amountBigInt],
                });

                const receipt = await publicClient.waitForTransactionReceipt({ hash });

                if (receipt.status === 'success') {
                    toast.success('Withdrawal initiated!', {
                        description: `Withdrawing ${amount} tokens`,
                    });
                    return true;
                } else {
                    toast.error('Withdrawal failed');
                    return false;
                }
            } catch (error) {
                console.error('Withdrawal error:', error);
                toast.error('Failed to withdraw tokens', {
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
                    address: CONTRACT_ADDRESS,
                    abi: stakingAbi,
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
                    address: CONTRACT_ADDRESS,
                    abi: stakingAbi,
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
        
     
        refreshData: fetchUserStakingData,
        refreshStats: fetchProtocolStats,
    };
};

export default useStaking;
