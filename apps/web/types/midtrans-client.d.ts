/**
 * Type declarations for midtrans-client
 * @see https://github.com/Midtrans/midtrans-nodejs-client
 */

declare module 'midtrans-client' {
    interface MidtransOptions {
        isProduction: boolean;
        serverKey: string;
        clientKey: string;
    }

    interface TransactionDetails {
        order_id: string;
        gross_amount: number;
    }

    interface CustomerDetails {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        billing_address?: AddressDetails[];
        shipping_address?: AddressDetails[];
    }

    interface AddressDetails {
        first_name?: string;
        last_name?: string;
        address?: string;
        city?: string;
        postal_code?: string;
        phone?: string;
        country_code?: string;
    }

    interface ItemDetails {
        id: string;
        name: string;
        price: number;
        quantity: number;
        brand?: string;
        category?: string;
        merchant_name?: string;
        url?: string;
    }

    interface TransactionCallbacks {
        finish?: string;
        unfinish?: string;
        error?: string;
    }

    interface CreateTransactionParams {
        transaction_details: TransactionDetails;
        item_details?: ItemDetails[];
        customer_details?: CustomerDetails;
        callbacks?: TransactionCallbacks;
        payment_type?: string;
        bank_transfer?: {
            bank?: string;
            permata?: boolean;
            bca?: boolean;
            bni?: boolean;
            bri?: boolean;
            mandiri?: boolean;
            vc?: boolean;
        };
        echannel?: {
            bill_info1?: string;
            bill_info2?: string;
        };
        credit_card?: {
            secure?: boolean;
            bank?: string;
            installment?: {
                required?: boolean;
                terms?: Record<string, number>;
            };
        };
        gopay?: {
            callback?: TransactionCallbacks;
        };
        shopeepay?: {
            callback?: TransactionCallbacks;
        };
        [key: string]: unknown;
    }

    interface CreateTransactionResponse {
        token: string;
        redirect_url: string;
    }

    interface TransactionStatusResponse {
        order_id: string;
        transaction_id: string;
        transaction_status: string;
        fraud_status?: string;
        gross_amount: string;
        payment_type: string;
        settlement_time?: string;
        transaction_time?: string;
        status_code: string;
        status_message: string;
        merchant_id?: string;
        signature_key?: string;
    }

    class Transaction {
        status(transactionId: string): Promise<TransactionStatusResponse>;
        statusb2b(transactionId: string): Promise<TransactionStatusResponse>;
        approve(transactionId: string): Promise<TransactionStatusResponse>;
        deny(transactionId: string): Promise<TransactionStatusResponse>;
        cancel(transactionId: string): Promise<TransactionStatusResponse>;
        expire(transactionId: string): Promise<TransactionStatusResponse>;
        refund(transactionId: string, parameter: Record<string, unknown>): Promise<TransactionStatusResponse>;
        notification(notificationObj: Record<string, unknown>): Promise<TransactionStatusResponse>;
    }

    class Snap {
        constructor(options: MidtransOptions);
        createTransaction(parameter: CreateTransactionParams): Promise<CreateTransactionResponse>;
        createTransactionToken(parameter: CreateTransactionParams): Promise<string>;
        createTransactionRedirectUrl(parameter: CreateTransactionParams): Promise<string>;
        transaction: Transaction;
    }

    class CoreApi {
        constructor(options: MidtransOptions);
        charge(parameter: Record<string, unknown>): Promise<TransactionStatusResponse>;
        capture(parameter: Record<string, unknown>): Promise<TransactionStatusResponse>;
        cardRegister(parameter: Record<string, unknown>): Promise<TransactionStatusResponse>;
        cardToken(parameter: Record<string, unknown>): Promise<TransactionStatusResponse>;
        cardPointInquiry(tokenId: string): Promise<TransactionStatusResponse>;
        [key: string]: (...args: unknown[]) => Promise<TransactionStatusResponse>;
    }

    class Iris {
        constructor(options: MidtransOptions);
        [key: string]: (...args: unknown[]) => Promise<TransactionStatusResponse>;
    }

    class MidtransError extends Error {
        httpStatusCode: number;
        message: string;
        fields?: Record<string, string>;
    }

    export { Snap, CoreApi, Iris, MidtransError };
}
