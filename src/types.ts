export type Account = {
    id: string;
    owner: string;
    balance: number;
    currency: string;
}

export type Transaction = {
    id: string;
    accountId: string;
    amount: number;
    type: 'credit' | 'debit';
    description: string;
    date: string;
}

export type DB = {
    accounts: Account[];
    transactions: Transaction[];
}

export type ToolResult = 
| { ok: true; data: unknown }
| { ok:false; error: string }