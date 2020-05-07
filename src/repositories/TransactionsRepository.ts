import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const extract = await this.find();

    const findIncome = extract
      .filter(transaction => transaction.type === 'income')
      .reduce((total, { value }) => total + value, 0);

    const findOutcome = extract
      .filter(transaction => transaction.type === 'outcome')
      .reduce((total, { value }) => total + value, 0);

    const balance = {
      income: findIncome,
      outcome: findOutcome,
      total: findIncome - findOutcome,
    };

    return balance;
  }
}

export default TransactionsRepository;
