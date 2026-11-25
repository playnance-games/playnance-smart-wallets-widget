/**
 * The EIP-1193 provider a site hands to ethers, viem or wagmi (design plan,
 * section 7.2). Reading methods go straight to the chain. Signing goes to the
 * wallet frame, which decides for itself whether to ask the user. The key
 * cannot be read out through this provider.
 */
import { type WalletChannel } from "./channel.js";
import { type WalletState } from "./protocol.js";
export type Chain = {
    chainId: number;
    /** JSON-RPC endpoint of the chain. */
    rpcUrl: string;
    name?: string;
    wsUrl?: string;
    /** Block explorer; used to link to a sent transaction. */
    explorerUrl?: string;
    /** The coin that pays for gas. Assumed to have 18 decimals when left out. */
    nativeCurrency?: {
        symbol: string;
        name?: string;
        decimals: number;
    };
    /** ERC-20 tokens the kit's `getBalances` and `transfer` know by symbol. */
    tokens?: Token[];
};
export type Token = {
    symbol: string;
    name?: string;
    address: string;
    decimals: number;
};
export type RequestArguments = {
    method: string;
    params?: unknown[] | Record<string, unknown>;
};
export interface Eip1193Provider {
    request(args: RequestArguments): Promise<unknown>;
    on(event: string, listener: (...args: any[]) => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
}
type Fetch = typeof fetch;
export declare class WalletProvider implements Eip1193Provider {
    #private;
    constructor(options: {
        channel: WalletChannel;
        chains: Chain[];
        defaultChainId?: number;
        /** Opens the sign-in modal; used by eth_requestAccounts. */
        connect: () => Promise<unknown>;
        fetch?: Fetch;
    });
    /** The chain in use, as configured. */
    get chain(): Chain | null;
    get chainId(): string | null;
    /** MetaMask or Coinbase signs and sends. Pass null to go back to the Playnance frame. */
    useExternal(provider: Eip1193Provider | null): void;
    /** Follows a chain the external wallet switched to, when this site knows that chain. */
    adoptChain(chainId: string): void;
    /** Called by the client whenever the wallet frame reports a new state. */
    update(state: WalletState): void;
    on(event: string, listener: (...args: any[]) => void): this;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    request(args: RequestArguments): Promise<unknown>;
}
export {};
