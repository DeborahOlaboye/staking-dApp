import { useCallback, useState, useEffect } from "react";
import {
    useAccount,
    usePublicClient,
    useWalletClient,
    useWriteContract,
    useReadContract,
} from "wagmi";
import { ethers } from "ethers";
import { useEthersProvider } from "./ethersAdapter";
import { toast } from "sonner";
import { parseEther } from "viem";
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
    const ethersProvider = useEthersProvider();
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

    // Initial data fetch
    useEffect(() => {
        fetchUserStakingData();
        fetchProtocolStats();
    }, [fetchUserStakingData, fetchProtocolStats]);

    // Real-time event listeners using ethers
    useEffect(() => {
        if (!ethersProvider || !address) return;

        const stakingContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            stakingAbi,
            ethersProvider
        );

        const onStaked = (user, amount, timestamp, newTotalStaked, currentRewardRate) => {
            if (user.toLowerCase() === address.toLowerCase()) {
                toast.success('Staking successful!', {
                    description: `Successfully staked ${ethers.formatEther(amount)} tokens`,
                });
                fetchUserStakingData();
                fetchProtocolStats();
            }
        };

        const onWithdrawn = (user, amount, timestamp, newTotalStaked, currentRewardRate, rewardsAccrued) => {
            if (user.toLowerCase() === address.toLowerCase()) {
                toast.success('Withdrawal successful!', {
                    description: `Successfully withdrew ${ethers.formatEther(amount)} tokens with ${ethers.formatEther(rewardsAccrued)} rewards`,
                });
                fetchUserStakingData();
                fetchProtocolStats();
            }
        };

        const onRewardsClaimed = (user, amount, timestamp, newPendingRewards, totalStaked) => {
            if (user.toLowerCase() === address.toLowerCase()) {
                toast.success('Rewards claimed!', {
                    description: `Successfully claimed ${ethers.formatEther(amount)} tokens`,
                });
                fetchUserStakingData();
            }
        };

        const onEmergencyWithdrawn = (user, amount, penalty, timestamp, newTotalStaked) => {
            if (user.toLowerCase() === address.toLowerCase()) {
                toast.warning('Emergency withdrawal completed', {
                    description: `Withdrew ${ethers.formatEther(amount)} tokens with ${ethers.formatEther(penalty)} penalty`,
                });
                fetchUserStakingData();
                fetchProtocolStats();
            }
        };

        const onRewardRateUpdated = (oldRate, newRate, timestamp, totalStaked) => {
            toast.info('Reward rate updated', {
                description: `New rate: ${(Number(newRate) / 100).toFixed(2)}%`,
            });
            fetchProtocolStats();
        };

        // Subscribe to events
        stakingContract.on('Staked', onStaked);
        stakingContract.on('Withdrawn', onWithdrawn);
        stakingContract.on('RewardsClaimed', onRewardsClaimed);
        stakingContract.on('EmergencyWithdrawn', onEmergencyWithdrawn);
        stakingContract.on('RewardRateUpdated', onRewardRateUpdated);

        return () => {
            stakingContract.off('Staked', onStaked);
            stakingContract.off('Withdrawn', onWithdrawn);
            stakingContract.off('RewardsClaimed', onRewardsClaimed);
            stakingContract.off('EmergencyWithdrawn', onEmergencyWithdrawn);
            stakingContract.off('RewardRateUpdated', onRewardRateUpdated);
        };
    }, [address, ethersProvider, fetchUserStakingData, fetchProtocolStats]);

    // Periodic refresh for pending rewards
    useEffect(() => {
        if (!address) return;

        const interval = setInterval(() => {
            fetchUserStakingData();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [address, fetchUserStakingData]);

    // Approve tokens for staking
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

    // Stake tokens
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

    // Withdraw tokens
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

    // Claim rewards
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

    // Emergency withdraw
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
        // State
        userStakingData,
        protocolStats,
        isLoading,
        
        // Actions
        approveTokens,
        stakeTokens,
        withdrawTokens,
        claimRewards,
        emergencyWithdraw,
        
        // Utilities
        refreshData: fetchUserStakingData,
        refreshStats: fetchProtocolStats,
    };
};

export default useStaking;
