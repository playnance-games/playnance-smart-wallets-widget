/**
 * What the kit draws on the site's page: the modal that holds the wallet
 * origin's sign-in, the window in which the wallet asks the user to confirm, the
 * account menu, and the link to the wallet's export page. The kit never sees
 * what is typed or shown inside the wallet's own pages.
 */
import { type SignInLinkTicket, type ExternalWallet, type SignInMethod } from "./protocol.js";
import type { Eip1193Provider } from "./provider.js";
export type ConnectDialogTheme = "light" | "dark";
/**
 * Look of the connect card (`uiConfig.design`). `regular` is the default card
 * that follows `uiConfig.mode`; the others are fixed looks drawn by the wallet's
 * sign-in page (`?design=`), and the kit only frames them here.
 */
export type ConnectDesign = "regular" | "space" | "cyberpunk" | "gta" | "bossclub" | "playnanceai";
export declare const CONNECT_DESIGNS: readonly ConnectDesign[];
/** A design the sign-in page knows by name; `regular` is no design at all. */
export declare function namedDesign(design: ConnectDesign | undefined): Exclude<ConnectDesign, "regular"> | null;
/**
 * Opens the wallet's sign-in in a modal on this page. The iframe loads the
 * wallet origin (`signin.html` with a frame-issued ticket, or `open.html` then
 * `signin.html` for popups); this page never sees
 * keys, shares or session secrets. Resolves signedIn once the user has signed in,
 * with external set when they chose MetaMask or Coinbase. signedIn is false
 * if they closed or cancelled.
 */
export type ExternalConnection = {
    wallet: ExternalWallet;
    address: string;
    provider: Eip1193Provider;
};
export type OpenedSignIn = {
    signedIn: boolean;
    external: ExternalConnection | null;
};
export type OpenSignInOptions = {
    walletOrigin: string;
    method?: SignInMethod;
    hint?: string;
    theme?: ConnectDialogTheme;
    /** Look of the card; `regular` or unset keeps the default card. */
    design?: ConnectDesign;
    /** The wallet frame opens the letterbox; avoids open.html reaching through a sandboxed modal iframe. */
    prepareSignIn?: () => Promise<SignInLinkTicket>;
    /** Called when the user gives up on this page, so that the wallet closes its sign-in. */
    cancel?: () => void;
    /**
     * A blank window the kit opened from the user's click, for a sign-in that
     * needs no card ("Google only"). The kit sends it to the wallet's sign-in
     * page, which goes to Google by itself, and draws nothing on this page. If
     * the window cannot be sent there, it is closed and the card is shown.
     */
    signInWindow?: Window | null;
    /**
     * Called once `signInWindow` is on the wallet's sign-in page. From then on
     * the window belongs to the wallet origin, which cuts it off from this page
     * (`Cross-Origin-Opener-Policy`): the page must not touch the handle again,
     * not even to read `closed`, or the browser logs a warning. The wallet
     * closes its own window.
     */
    onWindowSent?: () => void;
    /** Ends the sign-in as if the user had closed it. */
    signal?: AbortSignal;
    /**
     * MetaMask or Coinbase, chosen inside the iframe. Runs on this page, which
     * is where those wallets are injected. A failure is shown in the iframe.
     */
    connectExternal?: (wallet: ExternalWallet) => Promise<{
        ok: true;
        address: string;
        provider: Eip1193Provider;
    } | {
        ok: false;
        message: string;
    }>;
};
export declare function openSignIn(options: OpenSignInOptions): Promise<OpenedSignIn>;
/**
 * Opens the wallet's confirmation inside the same in-page widget as connect.
 * `cancel` runs if the user dismisses it without deciding. The page inside
 * reports its own decision over the wallet link; closing the widget is a refusal.
 */
export declare function openConfirmation(walletOrigin: string, confirmId: string, cancel: () => void, theme?: ConnectDialogTheme): void;
/**
 * Opens the wallet's export flow in a modal on this page. The iframe loads the
 * wallet origin (`export.html?embed=1`); the private key is shown only inside
 * that iframe and never reaches this page.
 */
export declare function openExport(walletOrigin: string, address?: string, theme?: ConnectDialogTheme, design?: ConnectDesign): void;
/**
 * The menu under a mounted button while the user is connected: who is signed
 * in, the wallet address, "Export private key" and "Sign out". Returns a
 * function that closes it.
 */
export declare function openAccountMenu(anchor: Element, options: {
    label: string;
    address: string;
    /** Left out for MetaMask and Coinbase: those keys are not in this wallet. */
    onExport?: () => void;
    onSignOut: () => void;
    onClose?: () => void;
}): () => void;
