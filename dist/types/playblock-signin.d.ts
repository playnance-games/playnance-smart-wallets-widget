/**
 * Playblock's customer sign-in, run by the kit when `autosigninverify` is on.
 *
 * Two calls, with a signature between them that proves the user holds the
 * wallet:
 *
 *   POST {apiUrl}/signin          -> { id, message }   (and a `serial` header)
 *   wallet signs `message` (personal_sign)
 *   POST {apiUrl}/signin/verify   -> { token: { access_token }, profile, meta }
 *
 * Playblock checks the `Origin` of both calls. From a site's page the browser
 * sets it, so it is the site's own origin; a site that wants to send them
 * through its own server (to set `Origin` there) points `playblockApiUrl` at
 * that server's copy of these two routes.
 */
export declare const PLAYBLOCK_CUSTOMER_API = "https://api.playblock.io/v2/customer";
/** What Playblock answers once the wallet's signature is accepted. */
export type PlayblockSession = {
    /** Playblock's session token for this wallet (`token.access_token`). */
    accessToken: string;
    profile: Record<string, unknown>;
    meta: Record<string, unknown>;
};
/**
 * Campaign and analytics ids the site passes in, sent with the sign-in call so
 * Playblock can attribute the sign-up. Field names are Playblock's.
 */
export type SigninAttribution = {
    /** Google Analytics client id (the `_ga` cookie, `<clientId>` part). */
    clientId?: string;
    /** Google Analytics 4 session id (the `_ga_<container>` cookie). */
    sessionId?: string;
    /** Facebook click id from the landing URL. */
    fbclid?: string;
    /** Facebook browser id (the `_fbp` cookie). */
    fbp?: string;
    /** Snapchat cookie id (the `_scid` cookie). */
    scid?: string;
    /** Snapchat click id from the landing URL. */
    scClickId?: string;
    /** Taboola click id from the landing URL. */
    tblci?: string;
    /** The site's own stable per-device id. */
    pwaId?: string;
};
/** Keeps only the known attribution fields that have a non-empty value. */
export declare function attributionFields(attribution: SigninAttribution | undefined): SigninAttribution;
export type PlayblockSignInRequest = {
    /** Base of the customer API, without a trailing slash. */
    apiUrl: string;
    wallet: string;
    /** `google`, `email_passwordless`, `sms_passwordless`, `metaMask` or `coinbase`. */
    walletProvider: string;
    /** The page the user signed in on. */
    uri: string;
    /** The site's `clientId`. */
    appId: string;
    /** Left out of the request when the site gave none. */
    partnerRef?: string;
    /** Campaign ids for the sign-in. Only the known fields with a value are sent. */
    attribution?: SigninAttribution;
    email?: string;
    avatarUrl?: string;
    /** The Playnance identity token, sent as the bearer. Not sent for MetaMask and Coinbase. */
    idToken?: string;
    /** Has the wallet sign `message` and returns the signature. */
    sign: (message: string) => Promise<string>;
    fetch: typeof fetch;
};
/** `personal_sign` takes the message as hex. */
export declare function toHex(text: string): string;
export declare function playblockSignIn(request: PlayblockSignInRequest): Promise<PlayblockSession>;
