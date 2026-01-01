import { describe, it, expect } from 'vitest';
import { GenericExtractor, HDFCExtractor, ICICIExtractor, SBIExtractor } from '../index';

describe('GenericExtractor', () => {
    it('should extract transactions from a simple text statement', () => {
        const mockText = `
            Statement for August 2024
            01/08/2024 UPI-ALIPAY-12345 500.00 DR
            02/08/2024 INTEREST CREDIT 50.00 CR
            15-08-2024 AMZN-MARKETPLACE 1200.50 DR
            20/08/2024 SALARY 50000.00 CR
        `;

        const transactions = GenericExtractor.extract(mockText);

        expect(transactions).toHaveLength(4);
        expect(transactions[0]).toMatchObject({
            date: '01/08/2024',
            payee: 'UPI-ALIPAY-12345',
            amount: 500.00,
            type: 'expense'
        });
    });
});

describe('HDFCExtractor', () => {
    it('should extract transactions from realistic HDFC format', () => {
        const mockText = `
            01/10/23 UPI-ZOMATO-202310011234-987654321098@hdfc 100123456789 01/10/23 299.00 0.00 5230.50
            02/10/23 CASH WITHDRAWAL-ATM-HDFC-MUMBAI 20231002001 02/10/23 5000.00 0.00 230.50
            05/10/23 NEFT-SUBHASH CHANDRA-STBK0001234 12345678 05/10/23 0.00 15000.00 15230.50
        `;

        const transactions = HDFCExtractor.extract(mockText);

        expect(transactions).toHaveLength(3);
        expect(transactions[0]).toMatchObject({
            date: '01/10/2023',
            payee: 'UPI-ZOMATO-202310011234-987654321098@hdfc',
            amount: 299.00,
            type: 'expense'
        });
        expect(transactions[2]).toMatchObject({
            date: '05/10/2023',
            payee: 'NEFT-SUBHASH CHANDRA-STBK0001234',
            amount: 15000.00,
            type: 'income'
        });
    });
});

describe('ICICIExtractor', () => {
    it('should extract transactions from realistic ICICI format', () => {
        const mockText = `
            1 01/10/2023 01/10/2023 UPI/ZOMATO/20231001/MUMBAI 123456 150.00 0.00 10000.00
            2 03/10/2023 02/10/2023 MMT/PAYTM/RENT/OCT 567890 12000.00 0.00 -2000.00
            3 05/10/2023 05/10/2023 Salary/GOOGLE/SEP23 0.00 100000.00 98000.00
        `;

        const transactions = ICICIExtractor.extract(mockText);

        expect(transactions).toHaveLength(3);
        expect(transactions[0]).toMatchObject({
            date: '01/10/2023',
            payee: 'UPI/ZOMATO/20231001/MUMBAI',
            amount: 150.00,
            type: 'expense'
        });
        expect(transactions[2]).toMatchObject({
            date: '05/10/2023',
            payee: 'Salary/GOOGLE/SEP23',
            amount: 100000.00,
            type: 'income'
        });
    });
});

describe('SBIExtractor', () => {
    it('should extract transactions from realistic SBI format', () => {
        const mockText = `
            01 Oct 2023 01 Oct 2023 UPI/CR/327456789012/SWIGGY/HDFC/PAYMENT 327456789012 12345 450.00 0.00 5000.00
            05 Oct 2023 05 Oct 2023 TRANSFER-FROM 31998877665 99999 0.00 20000.00 25000.00
            15 Oct 2023 15 Oct 2023 BY TRANSFER-NEFT*SBIN0001234*12345678 12345678 00000 0.00 5000.00 28000.00
        `;

        const transactions = SBIExtractor.extract(mockText);

        expect(transactions).toHaveLength(3);
        expect(transactions[0]).toMatchObject({
            date: '01/10/2023',
            payee: 'UPI/CR/327456789012/SWIGGY/HDFC/PAYMENT 327456789012 12345',
            amount: 450.00,
            type: 'expense'
        });
        expect(transactions[1]).toMatchObject({
            date: '05/10/2023',
            payee: 'TRANSFER-FROM 31998877665 99999',
            amount: 20000.00,
            type: 'income'
        });
    });
});
