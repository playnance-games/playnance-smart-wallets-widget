/** The hidden wallet frame and the messages exchanged with it. */
import { type KitRequest, type WalletState } from "./protocol.js";
export declare class ProviderRpcError extends Error {
    code: number;
    data?: unknown;
    constructor(code: number, message: string, data?: unknown);
}
/** What the rest of the kit needs from the wallet frame; tests supply a fake. */
export interface WalletChannel {
    /** Resolves with the wallet's state once the frame has answered. */
    ready: Promise<WalletState>;
    send<T>(request: KitRequest): Promise<T>;
    onState(listener: (state: WalletState) => void): void;
}
export declare function createFrameChannel(options: {
    walletOrigin: string;
    clientId: string;
    /** Called when a request needs the user's approval in a wallet-origin window. */
    onConfirm: (confirmId: string, cancel: () => void) => void;
}): WalletChannel;
