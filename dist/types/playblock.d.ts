export declare const PLAYBLOCK: {
    chainId: number;
    name: string;
    rpcUrl: string;
    wsUrl: string;
    explorerUrl: string;
    nativeCurrency: {
        symbol: string;
        name: string;
        decimals: number;
    };
    tokens: {
        symbol: string;
        name: string;
        address: string;
        decimals: number;
    }[];
};
/** "12.5" with 2 decimals is 1250. Refuses more decimal places than the coin has. */
export declare function parseUnits(amount: string, decimals: number): bigint;
export declare function formatUnits(value: bigint, decimals: number): string;
export declare function isAddress(value: unknown): value is string;
/** Call data of the ERC-20 `transfer(to, amount)`. */
export declare function encodeTransfer(to: string, amount: bigint): string;
/** Call data of the ERC-20 `balanceOf(owner)`. */
export declare function encodeBalanceOf(owner: string): string;
