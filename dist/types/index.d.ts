/**
 * Playnance login and wallet for any site.
 *
 * From a script tag (the wallet origin serves the file):
 *
 *   <script src="https://wallet.example.com/playnance-auth.js"></script>
 *   <script>
 *     const auth = PlaynanceAuth.init({
 *       clientId: "your-client-id",
 *       walletUrl: "https://wallet.example.com",
 *       chains: [{ chainId: 1, rpcUrl: "https://rpc.example.com" }],
 *       partnerRef: "YOUR_PARTNER_REF",   // required; sent to Playblock's sign-in
 *       // autosigninverify: false,       // default true: sign in to Playblock on connect
 *     })
 *     auth.mount("#connect")                       // or: await auth.connect()
 *     const [account] = await auth.provider.request({ method: "eth_requestAccounts" })
 *     await auth.provider.request({ method: "personal_sign", params: ["0x6869", account] })
 *     await auth.provider.request({ method: "eth_sendTransaction", params: [{ to, value: "0x1" }] })
 *     const { idToken } = await auth.getAuthTokenInfo()   // for your back end
 *   </script>
 *
 * From package.json:
 *
 *   import { init } from "@playnance/auth"
 *   const auth = init({ clientId, walletUrl, chains, partnerRef })
 *   const signer = await new ethers.BrowserProvider(auth.provider).getSigner()
 *
 * The site's origin must be on the wallet's allow-list for the client ID.
 * The login dialog, the session and the key all stay on the wallet origin:
 * this library receives the user's public details, the identity token, and
 * signatures. It cannot read the key, and it cannot silence a confirmation.
 */
import { PlaynanceAuthClient, type InitOptions } from "./client.js";
export declare function init(options: InitOptions): PlaynanceAuthClient;
export { PlaynanceAuthClient };
export { ProviderRpcError } from "./channel.js";
export { WalletProvider } from "./provider.js";
export { PLAYBLOCK, formatUnits, parseUnits } from "./playblock.js";
export type { AuthConnection, Balance, Transfer, ConnectDesign, ConnectDialogTheme, ConnectUiConfig, ConnectToOptions, InitOptions, PlayblockSession, Session, SigninAttribution, UserInfo, } from "./client.js";
export type { Chain, Eip1193Provider, RequestArguments, Token } from "./provider.js";
export type { WalletState, WalletUser } from "./protocol.js";
