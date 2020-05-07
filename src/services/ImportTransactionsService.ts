import { getCustomRepository, getRepository } from 'typeorm';
import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';

import uploadConfig from '../config/upload';

// import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface TransactionCSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  public async execute(importFileName: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const categories = await categoriesRepository.find();
    let newCategories: Category[] = [];

    const fileCSVPath = path.join(uploadConfig.directory, importFileName);
    const readCSVStream = fs.createReadStream(fileCSVPath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: TransactionCSV[] = [];
    const categoriesCSV: string[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, category] = line.map((item: string) =>
        item.trim(),
      );

      if (!title || !type || !value) return;

      if (
        !categories.find(cat => cat.title === category) &&
        !categoriesCSV.find(categCSV => categCSV === category)
      ) {
        categoriesCSV.push(category);
      }

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    if (categoriesCSV.length > 0) {
      const createCategories = categoriesCSV.map(item =>
        categoriesRepository.create({ title: item }),
      );

      newCategories = await categoriesRepository.save(createCategories);
    }

    const AllCategories = [...categories, ...newCategories];

    const newTransactions = transactions.map(transaction =>
      transactionsRepository.create({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: AllCategories.find(cat => cat.title === transaction.category),
      }),
    );

    await transactionsRepository.save(newTransactions);

    return newTransactions;
  }
}

export default ImportTransactionsService;
