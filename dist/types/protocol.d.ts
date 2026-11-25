/**
 * Messages between a consuming site (through the site kit) and the wallet
 * origin. Both sides import this file; it has no dependencies.
 *
 * Nothing secret crosses this boundary: no Supabase session, no share, no key.
 */
export declare const NAMESPACE = "playnance-wallet";
export declare const PROTOCOL_VERSION = 1;
/** The hidden frame's window name, so wallet-origin windows can find it. */
export declare const FRAME_NAME = "playnance-wallet-frame";
/**
 * The window Google sign-in runs in. For "Google only" (no-modal) the kit opens
 * it from the user's click, with these features, so that the browser treats it
 * as the window the user asked for; the wallet's sign-in page in that window
 * then goes to Google by itself. The sign-in card opens one the same way from
 * the click on its Google button.
 */
export declare const GOOGLE_WINDOW = "playnance-wallet-google";
export declare const GOOGLE_WINDOW_FEATURES = "popup,width=480,height=720";
export declare const PATHS: {
    readonly frame: "/frame.html";
    /**
     * What the kit opens for a sign-in or a confirmation: `open.html?to=signin`
     * or `open.html?to=confirm#<confirmId>`. It links the window to the wallet
     * frame and goes on to the page itself, which the site can then no longer
     * reach or replace.
     */
    readonly open: "/open.html";
    readonly signIn: "/signin.html";
    readonly confirm: "/confirm.html";
    /** Shows the private key. A page of its own on the wallet origin, never in a frame. */
    readonly export: "/export.html";
};
export type SignMethod = "personal_sign" | "eth_signTypedData_v4" | "eth_signTransaction";
export type WalletUser = {
    method: "google" | "email" | "sms";
    /** Email address, or phone number as +15551234567. */
    identifier: string;
    email?: string;
    name?: string;
    picture?: string;
    phoneNumber?: string;
};
/** A browser wallet the sign-in page can offer beside Google, email and SMS. */
export type ExternalWallet = "metamask" | "coinbase";
export type WalletState = {
    status: "signed_out";
    reason?: string;
} | {
    status: "connected";
    address: string;
    publicKey: string;
    user: WalletUser;
} | {
    status: "connected";
    /**
     * MetaMask or Coinbase on the site's page. The wallet frame never sends
     * this: those wallets are not Playnance accounts, and they hold their own keys.
     */
    external: ExternalWallet;
    address: string;
    publicKey: "";
    user: {
        method: ExternalWallet;
        identifier: string;
        name: string;
    };
};
/** Site kit -> wallet frame. */
export type KitRequest = {
    type: "hello";
}
/** `partnerRef`: the site's option, for the wallet service's antispam check. */
 | {
    type: "identity_token";
    partnerRef?: string;
} | {
    type: "sign";
    method: SignMethod;
    params: unknown[];
}
/** The user closed the confirmation window without deciding. */
 | {
    type: "cancel";
    confirmId: string;
}
/** The site's page gave up on a sign-in: the wallet closes its sign-in window. */
 | {
    type: "close_windows";
}
/** Opens a letterbox for the connect modal's sign-in iframe (the kit has the ticket, not open.html). */
 | {
    type: "prepare_sign_in";
} | {
    type: "logout";
    forgetDevice?: boolean;
};
/** Ticket the wallet frame gives the kit for a sign-in window or modal iframe. */
export type SignInLinkTicket = {
    id: string;
    key: string;
};
export type KitEnvelope = KitRequest & {
    ns: typeof NAMESPACE;
    v: number;
    id: string;
    clientId: string;
};
export type RpcError = {
    code: number;
    message: string;
};
/** Wallet frame -> site kit. */
export type FrameMessage = {
    ns: typeof NAMESPACE;
    id: string;
    ok: true;
    result: unknown;
} | {
    ns: typeof NAMESPACE;
    id: string;
    ok: false;
    error: RpcError;
}
/** The request needs the user's approval: open `open.html?to=confirm#<confirmId>` on the wallet origin. */
 | {
    ns: typeof NAMESPACE;
    id: string;
    confirm: {
        confirmId: string;
    };
} | {
    ns: typeof NAMESPACE;
    event: "state";
    state: WalletState;
};
/** What the kit asks the sign-in page to offer (query parameters `method` and `hint`). */
export type SignInMethod = WalletUser["method"];
/**
 * Wallet frame -> the site's page: the sign-in window finished or was closed.
 * Carries no data about the user. The window itself cannot say so: the site's
 * page and the window share nothing.
 */
export type SignInResult = "done" | "close";
export type SignInMessage = {
    ns: typeof NAMESPACE;
    signIn: SignInResult;
}
/** Embedded sign-in page → site kit: resize the modal iframe to document height. */
 | {
    ns: typeof NAMESPACE;
    signInResize: number;
}
/**
 * Embedded sign-in page → site kit: the user chose MetaMask or Coinbase.
 * The iframe cannot see those wallets. The kit, on the site's page, connects one.
 */
 | {
    ns: typeof NAMESPACE;
    connectWallet: ExternalWallet;
}
/** Site kit → embedded sign-in page: that wallet was not connected. */
 | {
    ns: typeof NAMESPACE;
    connectWalletResult: {
        ok: false;
        message: string;
    };
};
export type ConfirmMessage = 
/** Embedded confirmation page → site kit: resize the modal iframe to document height. */
{
    ns: typeof NAMESPACE;
    confirmResize: number;
}
/** Embedded confirmation page → site kit: the user decided, or the page is done. */
 | {
    ns: typeof NAMESPACE;
    confirmClose: true;
};
export type ExportMessage = 
/** Embedded export page → site kit: resize the modal iframe to document height. */
{
    ns: typeof NAMESPACE;
    exportResize: number;
}
/** Embedded export page → site kit: the user finished or dismissed export. */
 | {
    ns: typeof NAMESPACE;
    exportClose: true;
}
/** Embedded export page → site kit: tell me your origin, so I read only that host's session. */
 | {
    ns: typeof NAMESPACE;
    exportHello: true;
};
/** EIP-1193 error codes used on both sides. */
export declare const ERRORS: {
    readonly userRejected: 4001;
    readonly unauthorized: 4100;
    readonly unsupportedMethod: 4200;
    readonly disconnected: 4900;
    readonly unknownChain: 4902;
    readonly invalidParams: -32602;
    readonly internal: -32603;
};
