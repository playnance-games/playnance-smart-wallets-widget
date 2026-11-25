import type { ExternalWallet } from "./protocol.js";
import type { Chain, Eip1193Provider } from "./provider.js";
export type InjectedProvider = Eip1193Provider & {
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    isCoinbaseBrowser?: boolean;
    providers?: InjectedProvider[];
};
export declare function externalWalletLabel(wallet: ExternalWallet): "MetaMask" | "Coinbase Wallet";
export declare function listInjected(ethereum: unknown): InjectedProvider[];
/** The extension the user named. Another wallet that only pretends to be MetaMask is not chosen. */
export declare function providerFor(ethereum: unknown, wallet: ExternalWallet): InjectedProvider | null;
/**
 * Asks the named wallet for an account, then selects this site's chain.
 * Throws a short message the sign-in page can show.
 */
export declare function requestExternalAccount(ethereum: unknown, wallet: ExternalWallet, chain: Chain | null): Promise<{
    provider: InjectedProvider;
    address: string;
}>;
