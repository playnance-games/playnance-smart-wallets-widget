import { type WalletChannel } from "./channel.js";
import { type ExternalWallet, type WalletUser } from "./protocol.js";
import { type PlayblockSession, type SigninAttribution } from "./playblock-signin.js";
import { WalletProvider, type Chain } from "./provider.js";
import { type ConnectDesign, type ConnectDialogTheme } from "./ui.js";
export type InitOptions = {
    /** Identifies this site's project to the wallet. The site's origin must be allowed for it. */
    clientId: string;
    /** Address of the wallet origin, e.g. https://wallet.example.com. */
    walletUrl?: string;
    /** Older name for `walletUrl`, from the first widget. */
    authUrl?: string;
    /** Chains the provider can use, with their network addresses. The first is the default. Left out: Playblock. */
    chains?: Array<Omit<Chain, "chainId"> & {
        chainId: number | string;
    }>;
    defaultChainId?: number | string;
    /** @deprecated No longer used: the site does not talk to Supabase. */
    supabaseUrl?: string;
    /** @deprecated No longer used: the site does not talk to Supabase. */
    publishableKey?: string;
    /**
     * Styles the connect modal and sign-in page (Web3Auth `uiConfig.mode`).
     * `connectDialogTheme` is the older name for the same setting.
     */
    uiConfig?: ConnectUiConfig;
    /** @deprecated Use `uiConfig.mode`. */
    connectDialogTheme?: ConnectDialogTheme;
    /**
     * Runs Playblock's sign-in and verify calls once a wallet is connected:
     * `POST {playblockApiUrl}/signin`, the wallet signs the challenge, then
     * `POST {playblockApiUrl}/signin/verify`. The result is `session.playblock`.
     * Default `true`. When a call fails, `connect()` and `getSession()` reject.
     * Set `false` to leave Playblock out.
     */
    autosigninverify?: boolean;
    /**
     * Required. Sent to Playblock's sign-in as `partnerRef`, and to the wallet
     * service's antispam check for a client id that has it on.
     */
    partnerRef?: string;
    /**
     * Campaign and analytics ids for Playblock's sign-in call (the `clientId`,
     * `sessionId`, `fbclid`, `fbp`, `scid`, `scClickId`, `tblci` and `pwaId`
     * fields). Read them on the site's page and pass them here; the kit sends
     * only the known fields that have a value.
     */
    attribution?: SigninAttribution;
    /**
     * Base of Playblock's customer API. Default `https://api.playblock.io/v2/customer`.
     * Point it at the site's own server to send the two calls through it, when
     * that server sets the `Origin` header Playblock checks.
     */
    playblockApiUrl?: string;
};
export type { ConnectDesign, ConnectDialogTheme, PlayblockSession, SigninAttribution };
/** Web3Auth-shaped whitelabel for the in-page connect modal (`@web3auth/modal`). */
export type ConnectUiConfig = {
    mode?: ConnectDialogTheme;
    /**
     * Look of the connect card: `regular` (default, follows `mode`), `space`,
     * `cyberpunk`, `gta`, `bossclub` or `playnanceai` (the playnance.ai look, a
     * light card). The named designs have a fixed look and
     * ignore `mode`. Applies to the modal and to the single-method connects.
     */
    design?: ConnectDesign;
};
/**
 * What a site knows about the signed-in user. It has the shape the first
 * widget's session had, without the Supabase tokens: those never leave the
 * wallet origin.
 */
export type Session = {
    user: {
        /** The wallet address. */
        id: string;
        email?: string;
        phone?: string;
        user_metadata: {
            full_name?: string;
            name?: string;
            avatar_url?: string;
            picture?: string;
        };
        app_metadata: {
            provider: WalletUser["method"] | ExternalWallet;
        };
    };
    wallet: {
        address: string;
        publicKey: string;
    };
    /**
     * A signed identity token from the wallet service (the same string as
     * `getAuthTokenInfo().idToken`). Sites can verify it against the service's
     * published keys. Omitted for MetaMask and Coinbase: those are not Playnance
     * accounts. For a Playnance sign-in it is present once `connect()` or
     * `getSession()` resolves.
     */
    jwt?: string;
    /**
     * Playblock's answer to the sign-in and verify calls. Present once they
     * succeeded, which `connect()` and `getSession()` wait for. Left out when
     * `autosigninverify` is `false`. Kept in memory for the page visit.
     */
    playblock?: PlayblockSession;
};
export type AuthConnection = "google" | "email_passwordless" | "sms_passwordless";
export type ConnectToOptions = {
    authConnection?: AuthConnection;
    loginHint?: string;
};
export type UserInfo = {
    email?: string;
    name?: string;
    profileImage?: string;
    phoneNumber?: string;
    authConnection: AuthConnection;
    /** Email address, or phone number for SMS sign-ins. */
    userId: string;
    idToken: string;
};
export type Balance = {
    symbol: string;
    /** The token's contract; null for the gas coin. */
    address: string | null;
    decimals: number;
    /** In the coin's smallest unit, as decimal text. */
    value: string;
    /** In whole coins, as text. */
    formatted: string;
};
export type Transfer = {
    hash: string;
    explorerUrl: string | null;
};
/**
 * `error` carries the `Error` of a sign-in that failed after the wallet connected (for example Playblock's).
 * `signin:start` fires when `connect()` / `connectTo()` begins a sign-in attempt and `signin:end` when it
 * finishes, whatever the outcome (signed in, closed by the user, or failed). `signin:end` carries
 * `{ signedIn: boolean }`. They are always paired, and a click that joins an attempt already in progress
 * adds no event. Use them to show and hide a loading indicator.
 */
type KitEvent = "connected" | "disconnected" | "error" | "signin:start" | "signin:end";
export declare class PlaynanceAuthClient {
    #private;
    /** The EIP-1193 provider, for ethers, viem or wagmi. */
    readonly provider: WalletProvider;
    /** Resolves when the wallet frame has answered and an existing sign-in is restored. */
    readonly ready: Promise<void>;
    constructor(options: InitOptions, channel?: WalletChannel, deps?: {
        fetch?: typeof fetch;
    });
    /** `connected` once the wallet is usable, as in Web3Auth's kit. */
    get status(): "connected" | "disconnected";
    get connected(): boolean;
    /** Web3Auth's name for the same provider; null until connected. */
    get connection(): {
        ethereumProvider: WalletProvider;
    } | null;
    /**
     * Modal flow (`@web3auth/modal`): opens the in-page connect dialog with every
     * sign-in method. Design comes from `uiConfig` on init or `setUiConfig`.
     */
    connect(): Promise<Session | null>;
    /** Updates modal/sign-in chrome before the next `connect()` (`uiConfig` on Web3Auth). */
    setUiConfig(config: ConnectUiConfig): void;
    /**
     * No-modal flow (`@web3auth/no-modal` `connectTo`): opens the dialog for one
     * provider only, without the method chooser.
     */
    connectTo(connectorOrOptions?: AuthConnection | ConnectToOptions, options?: ConnectToOptions): Promise<Session | null>;
    getSession(): Promise<Session | null>;
    onAuthStateChange(listener: (session: Session | null) => void): () => void;
    on(event: KitEvent, listener: (payload?: unknown) => void): this;
    off(event: KitEvent, listener: (payload?: unknown) => void): this;
    /** The identity token for this site's back end. Re-issued when close to expiry. */
    getAuthTokenInfo(): Promise<{
        idToken: string;
    }>;
    /** Web3Auth's name in kit version 10. */
    getIdentityToken(): Promise<{
        idToken: string;
    }>;
    /** Web3Auth's name up to kit version 9. */
    authenticateUser(): Promise<{
        idToken: string;
    }>;
    getUserInfo(): Promise<UserInfo>;
    /**
     * Ends the session in the wallet origin. With `forgetDevice`, for shared
     * computers, the wallet also deletes this browser's key share.
     */
    logout(options?: {
        forgetDevice?: boolean;
    }): Promise<void>;
    signOut(): Promise<void>;
    /**
     * Opens the wallet's export flow in a modal on this page. The key is shown
     * only inside the wallet-origin iframe and is never given to this site: this
     * call returns nothing.
     */
    exportPrivateKey(): void;
    /**
     * What the wallet holds on the chain in use: the gas coin first, then the
     * chain's listed tokens. Read from the chain; nothing is asked of the wallet.
     */
    getBalances(): Promise<Balance[]>;
    /**
     * Sends an amount of the gas coin or of one of the chain's listed tokens to
     * an address. `amount` is in whole coins, as text: "12.5". The wallet shows
     * the user what is being sent and asks before it signs. Resolves with the
     * transaction hash once the chain has accepted the transaction for sending.
     */
    transfer(request: {
        asset: string;
        to: string;
        amount: string;
    }): Promise<Transfer>;
    /**
     * Turns an element into the login widget's button. Signed out, a click opens
     * the login dialog. Connected, it shows who is signed in and a click opens a
     * menu with "Export private key" and "Sign out".
     */
    mount(selector: string): Promise<Session | null>;
}
