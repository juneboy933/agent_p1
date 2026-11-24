import { describe, it, expect } from 'vitest';
import { createDB, createTools, executeTool } from '../tools';

const tools = () => createTools(createDB());

describe('Get Balance', () => {
    it('Returns the balance for a known account', () => {
        const r = executeTool(tools(), 'getBalance', {accountId: 'acc-1'});
        expect(r).toEqual({
            ok: true, 
            data: {accountId: 'acc-1', balance: 15000, currency: 'KES'}
        })
    });

    it('Returns error for unknown account', () => {
        const r = executeTool(tools(), 'getBalance', {accountId: 'nope'});
        expect(r).toMatchObject({
            ok: false,
            error: expect.stringMatching(/not found/i)
        })
    });

    it('Returns validation error for missing accountID', () => {
        const r = executeTool(tools(), 'getBalance', {});
        expect(r).toMatchObject({
            ok: false,
            error: expect.stringMatching(/invalid input/i)
        });
    })
});

describe('List Transaction', () => {
    it('Returns newest first and respects limits', () => {
        const r = executeTool(tools(), 'listTransactions', {accountId: 'acc-1', limit: 2});
        expect(r.ok).toBe(true)
        const data = (r as {ok: true; data: { id: string }[] }).data;
        expect(data).toHaveLength(2);
        expect(data[0].id).toBe('t4');
    });

    it('Returns the transaction with a valid transaction ID', () => {
        const r = executeTool(tools(), 'getTransactionById', { transactionId: 't4'});
        expect(r.ok).toBe(true)
        const data = (r as {ok:true; data: { id: string }}).data;
        expect(data.id).toBe('t4');
    })

    it('Reject non-numeric limit instead of throwing', () => {
        const r = executeTool(tools(), 'listTransactions', {account: 'acc-1', limit: 'abc'});
        expect(r.ok).toBe(false);
        expect(r).toMatchObject({
            ok: false,
            error: expect.stringMatching(/invalid input/i)
        })
    })

    it('Rejects an unkown transaction', () => {
        const r = executeTool(tools(), 'getTransactionById', { transactionId: 'unknown'});
        expect(r.ok).toBe(false)
        expect(r).toMatchObject({
            ok: false,
            error: expect.stringMatching(/not found/i)
        })
    })
});

describe('Execute Tool', () => {
    it('Returns error for unknown tool name', () => {
        const r = executeTool(tools(), 'deleteEverything', {});
        expect(r).toMatchObject({
            ok: false,
            error: expect.stringMatching(/unknown tool/i)
        });
    })
})