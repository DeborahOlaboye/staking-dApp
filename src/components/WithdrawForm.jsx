import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const WithdrawForm = ({ 
  isConnected, 
  withdrawAmount, 
  setWithdrawAmount, 
  handleWithdraw, 
  canWithdraw 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw</CardTitle>
        <CardDescription>Enter amount to withdraw</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="withdraw">Amount</Label>
            <Input
              id="withdraw"
              type="number"
              placeholder="0.0"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
          </div>
          <Button
            onClick={handleWithdraw}
            className="w-full"
            variant="secondary"
            disabled={!isConnected || !canWithdraw}
          >
            {!isConnected ? 'Connect Wallet to Withdraw' : 'Withdraw'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WithdrawForm;
