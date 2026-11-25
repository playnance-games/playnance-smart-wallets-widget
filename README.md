# Playnance auth kit

Login and wallet for any site. The kit gives your page a sign-in button and an EIP-1193 provider for the signed-in user's wallet, which works with ethers, viem and wagmi. The login dialog, the session and the private key all stay on the wallet origin. Your page receives the user's public details, the identity token, signatures and transaction hashes. It never receives the key.

## Quick start

```html
<script src="https://wallet.example.com/playnance-auth.js"></script>
<script>
  const auth = PlaynanceAuth.init({
    clientId: "your-client-id",
    walletUrl: "https://wallet.example.com",
    partnerRef: "YOUR_PARTNER_REF",   // required
  })
  auth.mount("#connect")              // or: await auth.connect()
</script>
```

Without `chains`, the kit uses Playblock (chain id `1829`). To use other chains, pass `chains: [{ chainId, rpcUrl, ... }]`; the first one is the default.

## Choosing a theme

Two settings control the look of the connect dialog and the sign-in page. Set them in `init` under `uiConfig`:

```js
const auth = PlaynanceAuth.init({
  clientId: "your-client-id",
  walletUrl: "https://wallet.example.com",
  partnerRef: "YOUR_PARTNER_REF",
  uiConfig: { mode: "dark", design: "regular" },
})
```

| Field | Values | What it does |
| --- | --- | --- |
| `mode` | `"light"` (default), `"dark"` | Light or dark colors. Used by the `regular` design. |
| `design` | `"regular"` (default), `"space"`, `"cyberpunk"`, `"gta"`, `"bossclub"` | The card's look. `regular` follows `mode`. The other four have a fixed look and ignore `mode`. Any other value is treated as `regular`. |

The design applies to the connect modal, to single-method connects (`connectTo`), and to the private-key export page.

To switch theme at runtime, for example from a site's theme toggle, call `setUiConfig`. It merges into the current config and takes effect the next time the dialog opens:

```js
auth.setUiConfig({ mode: "light" })   // or { design: "space" }
```

`connectDialogTheme` is deprecated; use `uiConfig.mode` instead. Only `mode` and `design` exist. There is no field for title text, custom colors, logos or promotional content.

## Campaign attribution

Pass `attribution` to `init` to send campaign ids with Playblock's `/signin` call. Read them on the site's page and pass the values in. The kit forwards only these fields, and only when they have a value: `clientId` (Google Analytics client id), `sessionId` (GA4 session id), `fbclid`, `fbp`, `scid`, `scClickId`, `tblci` and `pwaId`. Empty values and any other keys are left out. `/signin/verify` is unchanged.

```js
const auth = PlaynanceAuth.init({
  clientId: "your-client-id",
  walletUrl: "https://wallet.example.com",
  partnerRef: "YOUR_PARTNER_REF",
  attribution: { clientId: gaClientId, sessionId, fbclid, fbp, scid, scClickId, tblci, pwaId },
})
```

## Using the signed-in user's provider

`auth.provider` is an EIP-1193 provider (`auth.provider.request({ method, params })`). Use it to sign messages, sign typed data, send transactions, and place bets or other contract calls as the signed-in user.

### 1. Make sure someone is signed in

```js
const session = await auth.getSession()   // null when nobody is signed in
if (!session) await auth.connect()        // opens the login dialog; resolves with the session or null
```

`eth_requestAccounts` also opens the login dialog when nobody is signed in. `eth_accounts` never opens it: it returns `[]` when signed out.

### 2. Get the user's address

```js
const [address] = await auth.provider.request({ method: "eth_requestAccounts" })
```

### 3. Sign a message (`personal_sign`)

Use this to prove the user controls the address, for example to sign a login challenge from your back end.

```js
const toHex = (text) =>
  "0x" + Array.from(new TextEncoder().encode(text), (byte) => byte.toString(16).padStart(2, "0")).join("")

const signature = await auth.provider.request({
  method: "personal_sign",
  params: [toHex("Sign in to Example game, round 7"), address],
})
```

With ethers, `await signer.signMessage("...")` does the same.

### 4. Sign typed data (`eth_signTypedData_v4`)

Use this for bets that are signed off-chain and settled later by your back end.

```js
const bet = {
  domain: { name: "Example game", version: "1", chainId: 1829, verifyingContract: GAME_ADDRESS },
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    Bet: [
      { name: "round", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "player", type: "address" },
    ],
  },
  primaryType: "Bet",
  message: { round: "7", amount: "1000", player: address },
}

const signature = await auth.provider.request({
  method: "eth_signTypedData_v4",
  params: [address, JSON.stringify(bet)],
})
```

Send `signature` and the typed data to your back end. Verify it there against the same domain and the user's address, for example with `verifyTypedData` from viem or ethers. Use `eth_signTypedData_v4` only. The older `eth_signTypedData` (v1 and v3) and `eth_sign` are refused.

### 5. Place a bet on chain (contract call)

A bet that is a transaction is a contract call. The kit fills in `from`, `chainId`, nonce, gas and fees, the wallet signs the transaction, and the kit broadcasts it to the chain. Replace `GAME_ADDRESS`, `GAME_ABI` and `placeBet` with your contract.

**Plain JSON-RPC** (`eth_sendTransaction`):

```js
import { encodeFunctionData } from "viem"

const data = encodeFunctionData({ abi: GAME_ABI, functionName: "placeBet", args: [7n] })
const hash = await auth.provider.request({
  method: "eth_sendTransaction",
  params: [{ to: GAME_ADDRESS, data, value: "0x0" }],
})
```

**ethers v6:**

```js
import { BrowserProvider, Contract, parseUnits } from "ethers"

const signer = await new BrowserProvider(auth.provider).getSigner()
const game = new Contract(GAME_ADDRESS, GAME_ABI, signer)
const tx = await game.placeBet(7n, { value: parseUnits("0.01", 18) })
await tx.wait()   // resolves once the chain has the transaction
```

**viem:**

```js
import { createWalletClient, custom } from "viem"

const wallet = createWalletClient({ account: address, transport: custom(auth.provider) })
const hash = await wallet.writeContract({
  address: GAME_ADDRESS,
  abi: GAME_ABI,
  functionName: "placeBet",
  args: [7n],
  value: 10n ** 16n,
})
```

If the bet uses an ERC-20 token (for example USDP or GCOIN on Playblock), the user must approve the game contract first. Send a token `approve(spender, amount)` call with `eth_sendTransaction` (or the contract's `approve` with ethers or viem), wait for it, and then place the bet.

### 6. Send coins (transfer helper)

`auth.transfer` sends the chain's gas coin or one of its listed tokens, using whole coins as text:

```js
const { hash, explorerUrl } = await auth.transfer({ asset: "USDP", to: "0x...", amount: "12.5" })
```

`auth.getBalances()` lists what the user holds on the chain in use, with the asset symbols that `transfer` accepts.

### 7. Sign without sending (`eth_signTransaction`)

`eth_signTransaction` returns the signed raw transaction without broadcasting it. Use it when your own server or relayer broadcasts the transaction.

```js
const rawTx = await auth.provider.request({
  method: "eth_signTransaction",
  params: [{ to: GAME_ADDRESS, data, value: "0x0" }],
})
```

## Methods

| Method | Use |
| --- | --- |
| `eth_requestAccounts`, `eth_accounts` | The signed-in address. |
| `personal_sign` | Sign a message. Params: `[hexMessage, address]`. |
| `eth_signTypedData_v4` | Sign EIP-712 typed data, for example off-chain bets. |
| `eth_sendTransaction` | Sign and send a transaction or contract call. |
| `eth_signTransaction` | Sign a transaction without sending it. |
| `eth_call`, `eth_getBalance`, `eth_getTransactionReceipt`, other `eth_*`, `net_*`, `web3_*` | Read from the chain. |
| `wallet_switchEthereumChain` | Switch between the chains you configured. |

Refused: `eth_sign`, `eth_signTypedData` (v1 and v3), `eth_sendUserOperation`, and any method that would reveal the key.

## Errors

Errors are `ProviderRpcError` objects with a numeric `code`:

| Code | Meaning |
| --- | --- |
| `4001` | The user declined, or did not sign in. |
| `4100` | Nobody is signed in. Call `auth.connect()` first. |
| `4200` | The method is not available from this wallet. |
| `4902` | The chain is not configured for this wallet. |
| `-32602` | Invalid parameters, for example a transaction for another account or chain. |
| `-32603` | Internal error, including when the chain's network address does not answer. |

```js
try {
  await game.placeBet(7n, { value })
} catch (error) {
  if (error.code === 4001) return showMessage("Bet cancelled")
  throw error
}
```

## Notes

- **Confirmations.** Social logins (Google, email, SMS) sign automatically: the Playnance wallet signs without a confirmation window. The wallet's policy for your client ID can refuse some requests (error `4200`). Treat every signature as final: build the data on your side and show the user what they are approving before you call the provider.
- **Chain.** Transactions must be for the chain in use. The provider refuses a transaction whose `chainId` differs.
- **External wallets.** If the user signed in with MetaMask or Coinbase, `personal_sign`, `eth_signTypedData_v4`, `eth_signTransaction` and `eth_sendTransaction` go straight to that wallet's provider. The kit adds no confirmation of its own, and the signing behavior is that wallet's. Such accounts have no Playnance identity token.
- **Identity token.** For your back end's own checks, `await auth.getAuthTokenInfo()` returns `{ idToken }`. Verify it there, as described in the wallet docs.
