var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});

// authentication/wallet/kit/src/protocol.ts
var NAMESPACE = "playnance-wallet";
var PROTOCOL_VERSION = 1;
var FRAME_NAME = "playnance-wallet-frame";
var GOOGLE_WINDOW = "playnance-wallet-google";
var GOOGLE_WINDOW_FEATURES = "popup,width=480,height=720";
var PATHS = {
  frame: "/frame.html",
  /**
   * What the kit opens for a sign-in or a confirmation: `open.html?to=signin`
   * or `open.html?to=confirm#<confirmId>`. It links the window to the wallet
   * frame and goes on to the page itself, which the site can then no longer
   * reach or replace.
   */
  open: "/open.html",
  signIn: "/signin.html",
  confirm: "/confirm.html",
  /** Shows the private key. A page of its own on the wallet origin, never in a frame. */
  export: "/export.html"
};
var ERRORS = {
  userRejected: 4001,
  unauthorized: 4100,
  unsupportedMethod: 4200,
  disconnected: 4900,
  unknownChain: 4902,
  invalidParams: -32602,
  internal: -32603
};

// authentication/wallet/kit/src/channel.ts
var ProviderRpcError = class extends Error {
  constructor(code, message, data) {
    super(message);
    __publicField(this, "code");
    __publicField(this, "data");
    this.name = "ProviderRpcError";
    this.code = code;
    this.data = data;
  }
};
var HELLO_TIMEOUT_MS = 2e4;
function createFrameChannel(options) {
  const { walletOrigin, clientId } = options;
  const pending = /* @__PURE__ */ new Map();
  const listeners = [];
  const frame = document.createElement("iframe");
  frame.name = FRAME_NAME;
  frame.title = "Playnance wallet";
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  frame.style.cssText = "display:none;width:0;height:0;border:0;";
  function send(request) {
    return new Promise((resolve, reject) => {
      const target = frame.contentWindow;
      if (!target) {
        reject(new ProviderRpcError(ERRORS.disconnected, "The wallet frame is not loaded"));
        return;
      }
      const id = randomId();
      pending.set(id, { resolve, reject });
      target.postMessage(
        { ns: NAMESPACE, v: PROTOCOL_VERSION, id, clientId, ...request },
        walletOrigin
      );
    });
  }
  window.addEventListener("message", (event) => {
    if (event.origin !== walletOrigin || event.source !== frame.contentWindow) return;
    const message = event.data;
    if (!message || typeof message !== "object" || message.ns !== NAMESPACE) return;
    if ("event" in message) {
      if (message.event === "state") listeners.forEach((listener) => listener(message.state));
      return;
    }
    const waiting = pending.get(message.id);
    if (!waiting) return;
    if ("confirm" in message) {
      const { confirmId } = message.confirm;
      options.onConfirm(confirmId, () => void send({ type: "cancel", confirmId }).catch(() => {
      }));
      return;
    }
    pending.delete(message.id);
    if (message.ok) waiting.resolve(message.result);
    else waiting.reject(new ProviderRpcError(message.error.code, message.error.message));
  });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(
        new ProviderRpcError(
          ERRORS.disconnected,
          "The wallet did not answer. Check that this site's origin is allowed for the client ID."
        )
      ),
      HELLO_TIMEOUT_MS
    );
    frame.addEventListener("load", () => {
      send({ type: "hello" }).then(
        (state) => {
          clearTimeout(timer);
          resolve(state);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  });
  ready.catch(() => {
  });
  frame.src = walletOrigin + PATHS.frame;
  const attach = () => document.body.appendChild(frame);
  if (document.body) attach();
  else document.addEventListener("DOMContentLoaded", attach, { once: true });
  return { ready, send, onState: (listener) => void listeners.push(listener) };
}
function randomId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// authentication/wallet/kit/src/playblock.ts
var PLAYBLOCK = {
  chainId: 1829,
  name: "Playblock",
  rpcUrl: "https://rpc.playblock.io/DkULAwrZ2DRErEhGjDmymvq6Eqipe46QW",
  wsUrl: "wss://rpc.playblock.io/DkULAwrZ2DRErEhGjDmymvq6Eqipe46QW",
  explorerUrl: "https://explorer.playblock.io",
  nativeCurrency: { symbol: "PBG", name: "PBG", decimals: 18 },
  tokens: [
    { symbol: "USDP", name: "USDP", address: "0x73C3cDd1418c3F17D54A81148387d93122802E72", decimals: 2 },
    { symbol: "GCOIN", name: "G Coin", address: "0xC3B539972C522d883aaA904aAAdcfE69A2d9F26B", decimals: 9 }
  ]
};
var UNITS = /^\d+(\.\d+)?$/;
function parseUnits(amount, decimals) {
  const text = String(amount).trim();
  if (!UNITS.test(text)) throw new Error("The amount must be a number such as 12.5");
  const [whole, fraction = ""] = text.split(".");
  const significant = fraction.replace(/0+$/, "");
  if (significant.length > decimals) {
    throw new Error(`This coin has ${decimals} decimal places; ${text} has more`);
  }
  return BigInt(whole + significant.padEnd(decimals, "0"));
}
function formatUnits(value, decimals) {
  const digits = value.toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}
var ADDRESS = /^0x[0-9a-fA-F]{40}$/;
function isAddress(value) {
  return typeof value === "string" && ADDRESS.test(value);
}
var word = (hex) => hex.toLowerCase().padStart(64, "0");
function encodeTransfer(to, amount) {
  return `0xa9059cbb${word(to.slice(2))}${word(amount.toString(16))}`;
}
function encodeBalanceOf(owner) {
  return `0x70a08231${word(owner.slice(2))}`;
}

// authentication/wallet/kit/src/injected.ts
var REJECTED = "The wallet was closed before an account was chosen.";
function externalWalletLabel(wallet) {
  return wallet === "metamask" ? "MetaMask" : "Coinbase Wallet";
}
function listInjected(ethereum) {
  if (!ethereum || typeof ethereum !== "object" || !("request" in ethereum)) return [];
  const injected = ethereum;
  if (typeof injected.request !== "function") return [];
  const providers = Array.isArray(injected.providers) ? injected.providers.filter((item) => item && typeof item.request === "function") : [];
  return providers.length > 0 ? providers : [injected];
}
function providerFor(ethereum, wallet) {
  const list = listInjected(ethereum);
  if (wallet === "coinbase") {
    return list.find((item) => item.isCoinbaseWallet === true || item.isCoinbaseBrowser === true) ?? null;
  }
  return list.find((item) => item.isMetaMask === true && item.isCoinbaseWallet !== true && item.isCoinbaseBrowser !== true) ?? null;
}
async function requestExternalAccount(ethereum, wallet, chain) {
  const provider = providerFor(ethereum, wallet);
  if (!provider) {
    throw new Error(
      wallet === "metamask" ? "MetaMask is not installed in this browser." : "Coinbase Wallet is not installed in this browser."
    );
  }
  let accounts;
  try {
    accounts = await provider.request({ method: "eth_requestAccounts" });
  } catch (error) {
    throw new Error(readable(error, REJECTED));
  }
  const address = Array.isArray(accounts) ? accounts.find((item) => isAddress(item)) : void 0;
  if (!address) throw new Error(REJECTED);
  if (chain) {
    await alignChain(provider, chain);
    await watchTokens(provider, chain, address);
  }
  return { provider, address };
}
async function watchTokens(provider, chain, address) {
  for (const token of chain.tokens ?? []) {
    const key = offeredKey(chain, address, token.address);
    if (wasOffered(key)) continue;
    try {
      await provider.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: { address: token.address, symbol: token.symbol, decimals: token.decimals }
        }
      });
    } catch {
    } finally {
      markOffered(key);
    }
  }
}
var OFFERED_PREFIX = "playnance-wallet-token-offered:";
function offeredKey(chain, address, token) {
  return `${OFFERED_PREFIX}${chain.chainId}:${address.toLowerCase()}:${token.toLowerCase()}`;
}
function localStore() {
  try {
    const storage = globalThis.localStorage;
    return storage && typeof storage.getItem === "function" ? storage : null;
  } catch {
    return null;
  }
}
function wasOffered(key) {
  try {
    return localStore()?.getItem(key) != null;
  } catch {
    return false;
  }
}
function markOffered(key) {
  try {
    localStore()?.setItem(key, "1");
  } catch {
  }
}
async function alignChain(provider, chain) {
  const chainId = `0x${chain.chainId.toString(16)}`;
  let current;
  try {
    current = await provider.request({ method: "eth_chainId" });
  } catch {
    current = null;
  }
  if (typeof current === "string" && current.toLowerCase() === chainId.toLowerCase()) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (error) {
    if (errorCode(error) !== 4902) {
      throw new Error(readable(error, "This site's chain was not selected in the wallet."));
    }
    const native = chain.nativeCurrency;
    try {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId,
            chainName: chain.name ?? `Chain ${chain.chainId}`,
            nativeCurrency: {
              name: native?.name ?? native?.symbol ?? "ETH",
              symbol: native?.symbol ?? "ETH",
              decimals: native?.decimals ?? 18
            },
            rpcUrls: [chain.rpcUrl],
            ...chain.explorerUrl ? { blockExplorerUrls: [chain.explorerUrl] } : {}
          }
        ]
      });
    } catch (addError) {
      throw new Error(readable(addError, "This site's chain was not added in the wallet."));
    }
  }
}
function errorCode(error) {
  if (!error || typeof error !== "object" || !("code" in error)) return NaN;
  const code = Number(error.code);
  return Number.isFinite(code) ? code : NaN;
}
function readable(error, fallback) {
  if (errorCode(error) === 4001) return REJECTED;
  const message = error instanceof Error ? error.message : error && typeof error === "object" && "message" in error ? String(error.message) : "";
  const clean = message.replace(/\s+/g, " ").trim();
  if (!clean || clean.length > 160) return fallback;
  return clean;
}

// authentication/wallet/kit/src/playblock-signin.ts
var PLAYBLOCK_CUSTOMER_API = "https://api.playblock.io/v2/customer";
var ATTRIBUTION_KEYS = ["clientId", "sessionId", "fbclid", "fbp", "scid", "scClickId", "tblci", "pwaId"];
function attributionFields(attribution) {
  const fields = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = attribution?.[key]?.trim();
    if (value) fields[key] = value;
  }
  return fields;
}
function failure(step, status) {
  return new Error(`Playblock ${step} failed with status ${status}`);
}
function toHex(text) {
  let hex = "0x";
  for (const byte of new TextEncoder().encode(text)) hex += byte.toString(16).padStart(2, "0");
  return hex;
}
async function playblockSignIn(request) {
  const base = request.apiUrl.replace(/\/+$/, "");
  const signInHeaders = { "content-type": "application/json" };
  if (request.idToken) signInHeaders.authorization = `Bearer ${request.idToken}`;
  const signIn = await request.fetch(`${base}/signin`, {
    method: "POST",
    headers: signInHeaders,
    body: JSON.stringify({
      wallet: request.wallet,
      uri: request.uri,
      walletProvider: request.walletProvider,
      appId: request.appId,
      ...request.partnerRef ? { partnerRef: request.partnerRef } : {},
      ...attributionFields(request.attribution),
      ...request.email ? { email: request.email } : {},
      ...request.avatarUrl ? { avatarUrl: request.avatarUrl } : {}
    })
  });
  if (!signIn.ok) throw failure("sign-in", signIn.status);
  const challenge = await signIn.json().catch(() => null);
  if (challenge?.id == null || typeof challenge.message !== "string") {
    throw new Error("Playblock sign-in answered without a challenge");
  }
  const serial = signIn.headers.get("serial");
  const signature = await request.sign(challenge.message);
  const verifyHeaders = { "content-type": "application/json" };
  if (serial) verifyHeaders.serial = serial;
  const verify = await request.fetch(`${base}/signin/verify`, {
    method: "POST",
    headers: verifyHeaders,
    body: JSON.stringify({ id: challenge.id, message: challenge.message, signature })
  });
  if (!verify.ok) throw failure("verification", verify.status);
  const answer = await verify.json().catch(() => null);
  const accessToken = typeof answer?.token?.access_token === "string" ? answer.token.access_token.trim() : "";
  if (!accessToken) throw new Error("Playblock verification answered without an access token");
  const record = (value) => value && typeof value === "object" ? value : {};
  return { accessToken, profile: record(answer?.profile), meta: record(answer?.meta) };
}

// authentication/wallet/kit/src/provider.ts
var REFUSED = /* @__PURE__ */ new Set([
  "eth_private_key",
  "private_key",
  "eth_sign",
  "secp256k1_sign",
  "eth_signTypedData",
  "eth_signTypedData_v1",
  "eth_signTypedData_v3",
  "eth_coinbase",
  "eth_mining",
  "eth_submitWork",
  "eth_submitHashrate",
  "eth_sendUserOperation"
]);
var READ_PREFIXES = ["eth_", "net_", "web3_"];
var RATE_LIMIT_WAITS_MS = [500, 1500, 3e3];
var EXTERNAL_FORWARDED = /* @__PURE__ */ new Set([
  "personal_sign",
  "eth_signTypedData_v4",
  "eth_signTransaction",
  "eth_sendTransaction",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain"
]);
var _channel, _chains, _connect, _fetch, _listeners, _state, _chain, _rpcId, _external, _WalletProvider_instances, address_fn, connected_fn, requireChain_fn, switchChain_fn, prepare_fn, sign_fn, rpc_fn, emit_fn;
var WalletProvider = class {
  constructor(options) {
    __privateAdd(this, _WalletProvider_instances);
    __privateAdd(this, _channel);
    __privateAdd(this, _chains);
    __privateAdd(this, _connect);
    __privateAdd(this, _fetch);
    __privateAdd(this, _listeners, /* @__PURE__ */ new Map());
    __privateAdd(this, _state, { status: "signed_out" });
    __privateAdd(this, _chain);
    __privateAdd(this, _rpcId, 0);
    /** MetaMask or Coinbase, once the user chose one. Null for a Playnance wallet. */
    __privateAdd(this, _external, null);
    __privateSet(this, _channel, options.channel);
    __privateSet(this, _chains, options.chains);
    __privateSet(this, _connect, options.connect);
    __privateSet(this, _fetch, options.fetch ?? ((input, init2) => fetch(input, init2)));
    __privateSet(this, _chain, options.chains.find((chain) => chain.chainId === options.defaultChainId) ?? options.chains[0] ?? null);
  }
  /** The chain in use, as configured. */
  get chain() {
    return __privateGet(this, _chain);
  }
  get chainId() {
    return __privateGet(this, _chain) ? toHex2(__privateGet(this, _chain).chainId) : null;
  }
  /** MetaMask or Coinbase signs and sends. Pass null to go back to the Playnance frame. */
  useExternal(provider) {
    __privateSet(this, _external, provider);
  }
  /** Follows a chain the external wallet switched to, when this site knows that chain. */
  adoptChain(chainId) {
    const chain = __privateGet(this, _chains).find((item) => toHex2(item.chainId) === chainId.toLowerCase());
    if (!chain || chain === __privateGet(this, _chain)) return;
    __privateSet(this, _chain, chain);
    __privateMethod(this, _WalletProvider_instances, emit_fn).call(this, "chainChanged", toHex2(chain.chainId));
  }
  /** Called by the client whenever the wallet frame reports a new state. */
  update(state) {
    const before = __privateMethod(this, _WalletProvider_instances, address_fn).call(this);
    __privateSet(this, _state, state);
    const after = __privateMethod(this, _WalletProvider_instances, address_fn).call(this);
    if (before === after) return;
    __privateMethod(this, _WalletProvider_instances, emit_fn).call(this, "accountsChanged", after ? [after] : []);
    if (after) __privateMethod(this, _WalletProvider_instances, emit_fn).call(this, "connect", { chainId: this.chainId });
    else __privateMethod(this, _WalletProvider_instances, emit_fn).call(this, "disconnect", new ProviderRpcError(ERRORS.disconnected, "Signed out"));
  }
  on(event, listener) {
    if (!__privateGet(this, _listeners).has(event)) __privateGet(this, _listeners).set(event, /* @__PURE__ */ new Set());
    __privateGet(this, _listeners).get(event).add(listener);
    return this;
  }
  removeListener(event, listener) {
    __privateGet(this, _listeners).get(event)?.delete(listener);
    return this;
  }
  async request(args) {
    if (!args || typeof args.method !== "string") {
      throw new ProviderRpcError(ERRORS.invalidParams, "request needs a method");
    }
    const { method } = args;
    const params = Array.isArray(args.params) ? args.params : args.params ? [args.params] : [];
    if (__privateGet(this, _external) && EXTERNAL_FORWARDED.has(method)) {
      __privateMethod(this, _WalletProvider_instances, connected_fn).call(this);
      return __privateGet(this, _external).request({ method, params });
    }
    switch (method) {
      case "eth_requestAccounts":
        if (!__privateMethod(this, _WalletProvider_instances, address_fn).call(this)) await __privateGet(this, _connect).call(this);
        if (!__privateMethod(this, _WalletProvider_instances, address_fn).call(this)) {
          throw new ProviderRpcError(ERRORS.userRejected, "The user did not sign in");
        }
        return [__privateMethod(this, _WalletProvider_instances, address_fn).call(this)];
      case "eth_accounts":
        return __privateMethod(this, _WalletProvider_instances, address_fn).call(this) ? [__privateMethod(this, _WalletProvider_instances, address_fn).call(this)] : [];
      case "eth_chainId":
        return toHex2(__privateMethod(this, _WalletProvider_instances, requireChain_fn).call(this).chainId);
      case "net_version":
        return String(__privateMethod(this, _WalletProvider_instances, requireChain_fn).call(this).chainId);
      case "wallet_switchEthereumChain":
        return __privateMethod(this, _WalletProvider_instances, switchChain_fn).call(this, params[0]);
      case "public_key":
        if (__privateGet(this, _external)) {
          throw new ProviderRpcError(ERRORS.unsupportedMethod, "This wallet does not share a public key here");
        }
        return __privateMethod(this, _WalletProvider_instances, connected_fn).call(this).publicKey;
      case "personal_sign":
      case "eth_signTypedData_v4":
        __privateMethod(this, _WalletProvider_instances, connected_fn).call(this);
        return __privateGet(this, _channel).send({ type: "sign", method, params });
      case "eth_signTransaction":
        return __privateMethod(this, _WalletProvider_instances, sign_fn).call(this, await __privateMethod(this, _WalletProvider_instances, prepare_fn).call(this, params[0]));
      case "eth_sendTransaction": {
        const signed = await __privateMethod(this, _WalletProvider_instances, sign_fn).call(this, await __privateMethod(this, _WalletProvider_instances, prepare_fn).call(this, params[0]));
        return __privateMethod(this, _WalletProvider_instances, rpc_fn).call(this, "eth_sendRawTransaction", [signed]);
      }
    }
    if (REFUSED.has(method)) {
      throw new ProviderRpcError(ERRORS.unsupportedMethod, `${method} is not available from this wallet`);
    }
    if (READ_PREFIXES.some((prefix) => method.startsWith(prefix))) {
      return __privateMethod(this, _WalletProvider_instances, rpc_fn).call(this, method, params);
    }
    throw new ProviderRpcError(ERRORS.unsupportedMethod, `${method} is not supported`);
  }
};
_channel = new WeakMap();
_chains = new WeakMap();
_connect = new WeakMap();
_fetch = new WeakMap();
_listeners = new WeakMap();
_state = new WeakMap();
_chain = new WeakMap();
_rpcId = new WeakMap();
_external = new WeakMap();
_WalletProvider_instances = new WeakSet();
address_fn = function() {
  return __privateGet(this, _state).status === "connected" ? __privateGet(this, _state).address : null;
};
connected_fn = function() {
  if (__privateGet(this, _state).status !== "connected") {
    throw new ProviderRpcError(ERRORS.unauthorized, "Connect the wallet first");
  }
  return __privateGet(this, _state);
};
requireChain_fn = function() {
  if (!__privateGet(this, _chain)) {
    throw new ProviderRpcError(ERRORS.unknownChain, "No chain is configured for this wallet");
  }
  return __privateGet(this, _chain);
};
switchChain_fn = function(target) {
  const wanted = target?.chainId;
  const chain = __privateGet(this, _chains).find(
    (item) => typeof wanted === "string" && toHex2(item.chainId) === wanted.toLowerCase()
  );
  if (!chain) {
    throw new ProviderRpcError(ERRORS.unknownChain, "That chain is not configured for this wallet");
  }
  if (chain !== __privateGet(this, _chain)) {
    __privateSet(this, _chain, chain);
    __privateMethod(this, _WalletProvider_instances, emit_fn).call(this, "chainChanged", toHex2(chain.chainId));
  }
  return null;
};
prepare_fn = async function(input) {
  const { address } = __privateMethod(this, _WalletProvider_instances, connected_fn).call(this);
  if (typeof input !== "object" || input === null) {
    throw new ProviderRpcError(ERRORS.invalidParams, "A transaction object is required");
  }
  const tx = { ...input };
  const chain = __privateMethod(this, _WalletProvider_instances, requireChain_fn).call(this);
  if (tx.from !== void 0 && String(tx.from).toLowerCase() !== address.toLowerCase()) {
    throw new ProviderRpcError(ERRORS.unauthorized, "The transaction is from another account");
  }
  if (tx.chainId !== void 0 && normalizeQuantity(tx.chainId) !== toHex2(chain.chainId)) {
    throw new ProviderRpcError(ERRORS.unknownChain, "The transaction is for another chain");
  }
  tx.from = address;
  tx.chainId = toHex2(chain.chainId);
  if (tx.gasLimit !== void 0 && tx.gas === void 0) tx.gas = tx.gasLimit;
  delete tx.gasLimit;
  for (const key of ["value", "nonce", "gas", "gasPrice", "maxFeePerGas", "maxPriorityFeePerGas"]) {
    if (tx[key] !== void 0 && tx[key] !== null) tx[key] = normalizeQuantity(tx[key]);
    else delete tx[key];
  }
  if (tx.nonce === void 0) {
    tx.nonce = await __privateMethod(this, _WalletProvider_instances, rpc_fn).call(this, "eth_getTransactionCount", [address, "pending"]);
  }
  if (tx.gasPrice === void 0 && tx.maxFeePerGas === void 0) {
    const block = await __privateMethod(this, _WalletProvider_instances, rpc_fn).call(this, "eth_getBlockByNumber", ["latest", false]);
    if (block?.baseFeePerGas) {
      const tip = tx.maxPriorityFeePerGas !== void 0 ? BigInt(tx.maxPriorityFeePerGas) : BigInt(await __privateMethod(this, _WalletProvider_instances, rpc_fn).call(this, "eth_maxPriorityFeePerGas", []));
      tx.maxPriorityFeePerGas = toHex2(tip);
      tx.maxFeePerGas = toHex2(BigInt(block.baseFeePerGas) * 2n + tip);
    } else {
      delete tx.maxPriorityFeePerGas;
      tx.gasPrice = await __privateMethod(this, _WalletProvider_instances, rpc_fn).call(this, "eth_gasPrice", []);
    }
  } else if (tx.maxFeePerGas !== void 0 && tx.maxPriorityFeePerGas === void 0) {
    tx.maxPriorityFeePerGas = tx.maxFeePerGas;
  }
  if (tx.gas === void 0) {
    const { from, to, value, data, input: callData } = tx;
    const call = Object.fromEntries(
      Object.entries({ from, to, value, data: data ?? callData }).filter(
        ([, item]) => item !== void 0 && item !== null
      )
    );
    tx.gas = await __privateMethod(this, _WalletProvider_instances, rpc_fn).call(this, "eth_estimateGas", [call]);
  }
  return tx;
};
sign_fn = function(tx) {
  return __privateGet(this, _channel).send({ type: "sign", method: "eth_signTransaction", params: [tx] });
};
rpc_fn = async function(method, params) {
  const chain = __privateMethod(this, _WalletProvider_instances, requireChain_fn).call(this);
  let body;
  for (let attempt = 0; ; attempt++) {
    let limited;
    try {
      const response = await __privateGet(this, _fetch).call(this, chain.rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++__privateWrapper(this, _rpcId)._, method, params })
      });
      body = await response.json();
      limited = response.status === 429 || /rate limit/i.test(body.error?.message ?? "");
    } catch {
      throw new ProviderRpcError(ERRORS.internal, `The chain's network address did not answer ${method}`);
    }
    if (!limited || attempt === RATE_LIMIT_WAITS_MS.length) break;
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAITS_MS[attempt]));
  }
  if (body.error) {
    throw new ProviderRpcError(
      typeof body.error.code === "number" ? body.error.code : ERRORS.internal,
      body.error.message ?? `${method} failed`,
      body.error.data
    );
  }
  return body.result;
};
emit_fn = function(event, payload) {
  __privateGet(this, _listeners).get(event)?.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error(error);
    }
  });
};
function toHex2(value) {
  return `0x${value.toString(16)}`;
}
function normalizeQuantity(value) {
  try {
    if (typeof value === "bigint" || typeof value === "number") return toHex2(BigInt(value));
    if (typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value)) return toHex2(BigInt(value));
  } catch {
  }
  throw new ProviderRpcError(ERRORS.invalidParams, "Transaction quantities must be hex strings");
}

// authentication/wallet/kit/src/ui.ts
var CONNECT_DESIGNS = ["regular", "space", "cyberpunk", "gta", "bossclub"];
function namedDesign(design) {
  return design && design !== "regular" && CONNECT_DESIGNS.includes(design) ? design : null;
}
var DESIGN_FRAMES = {
  space: {
    shell: "display:block;width:min(440px,92vw);border:0;border-radius:28px;background:transparent;color-scheme:light;box-shadow:0 24px 64px rgba(10,6,48,.7),0 0 48px rgba(112,92,255,.28);",
    cancel: "position:absolute;top:14px;right:14px;z-index:2;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:28px;height:28px;padding:0;border:1px solid rgba(170,160,255,.45);border-radius:50%;background:rgba(20,18,64,.85);color:#f1efff;font:15px/1 ui-sans-serif,system-ui,sans-serif;min-height:0;overflow:hidden;cursor:pointer;box-shadow:0 0 12px rgba(120,100,255,.35);"
  },
  cyberpunk: {
    shell: "display:block;width:min(440px,92vw);border:0;border-radius:24px;background:transparent;color-scheme:light;box-shadow:0 0 36px rgba(0,229,255,.32),0 0 56px rgba(255,0,200,.28),0 24px 56px rgba(0,0,0,.7);",
    cancel: "position:absolute;top:14px;right:14px;z-index:2;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:28px;height:28px;padding:0;border:1px solid rgba(255,90,220,.6);border-radius:50%;background:rgba(30,10,50,.88);color:#fff;font:15px/1 ui-sans-serif,system-ui,sans-serif;min-height:0;overflow:hidden;cursor:pointer;box-shadow:0 0 12px rgba(255,0,200,.45);"
  },
  gta: {
    shell: "display:block;width:min(440px,92vw);border:0;border-radius:30px;background:transparent;color-scheme:light;box-shadow:0 0 40px rgba(255,70,170,.4),0 24px 56px rgba(30,0,50,.6);",
    cancel: "position:absolute;top:14px;right:14px;z-index:2;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:28px;height:28px;padding:0;border:1px solid rgba(255,255,255,.55);border-radius:50%;background:rgba(120,50,130,.7);color:#fff;font:15px/1 ui-sans-serif,system-ui,sans-serif;min-height:0;overflow:hidden;cursor:pointer;box-shadow:0 1px 6px rgba(0,0,0,.3);"
  },
  bossclub: {
    shell: "display:block;width:min(440px,92vw);border:0;border-radius:28px;background:transparent;color-scheme:light;box-shadow:0 0 40px rgba(212,170,90,.28),0 24px 56px rgba(0,0,0,.75);",
    cancel: "position:absolute;top:14px;right:14px;z-index:2;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:28px;height:28px;padding:0;border:1px solid rgba(212,170,90,.75);border-radius:50%;background:rgba(12,10,8,.9);color:#e8c98a;font:15px/1 Georgia,serif;min-height:0;overflow:hidden;cursor:pointer;"
  }
};
var THEMES = {
  light: {
    overlay: "position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);padding:24px;",
    shell: "display:block;width:min(440px,92vw);border:0;border-radius:16px;background:#fff;box-shadow:0 24px 48px rgba(0,0,0,.2);",
    cancel: "position:absolute;top:10px;right:10px;z-index:2;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:24px;height:24px;padding:0;border:1px solid rgba(0,0,0,.1);border-radius:50%;background:rgba(255,255,255,.88);color:#0a0a0a;font:13px/1 ui-sans-serif,system-ui,sans-serif;min-height:0;overflow:hidden;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.06);"
  },
  dark: {
    overlay: "position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);padding:24px;",
    shell: "display:block;width:min(440px,92vw);border:0;border-radius:16px;background:#171717;box-shadow:0 24px 56px rgba(0,0,0,.65);outline:1px solid #404040;",
    cancel: "position:absolute;top:10px;right:10px;z-index:2;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:24px;height:24px;padding:0;border:1px solid rgba(255,255,255,.12);border-radius:50%;background:rgba(38,38,38,.88);color:#fafafa;font:13px/1 ui-sans-serif,system-ui,sans-serif;min-height:0;overflow:hidden;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.35);"
  }
};
var BUTTON = "display:block;box-sizing:border-box;height:44px;border-radius:8px;font:inherit;font-weight:500;line-height:42px;cursor:pointer;text-decoration:none;";
var PLAIN = "border:1px solid #e5e5e5;background:#fff;color:#0a0a0a;";
async function openSignIn(options) {
  if (options.signInWindow) {
    const opened = await openSignInWindow(options, options.signInWindow);
    if (opened) return opened;
  }
  return openSignInCard(options);
}
async function openSignInWindow(options, target) {
  const giveUp = () => {
    try {
      target.close();
    } catch {
    }
    return null;
  };
  if (!options.prepareSignIn || !options.method) return giveUp();
  let ticket;
  try {
    ticket = await options.prepareSignIn();
  } catch {
    return giveUp();
  }
  const query = new URLSearchParams({ method: options.method, start: "1" });
  if (options.hint) query.set("hint", options.hint);
  if (options.theme === "dark") query.set("theme", "dark");
  const design = namedDesign(options.design);
  if (design) query.set("design", design);
  try {
    if (target.closed) {
      options.cancel?.();
      return { signedIn: false, external: null };
    }
    target.location.href = `${options.walletOrigin}${PATHS.signIn}?${query}#${ticket.id}.${ticket.key}`;
    options.onWindowSent?.();
  } catch {
    return giveUp();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome, byUser = false) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      options.signal?.removeEventListener("abort", onAbort);
      if (byUser) options.cancel?.();
      resolve(outcome);
    };
    const onMessage = (event) => {
      if (event.origin !== options.walletOrigin || event.source !== walletFrame()) return;
      const message = event.data;
      if (!message || message.ns !== NAMESPACE || !("signIn" in message)) return;
      if (message.signIn === "done") finish({ signedIn: true, external: null });
      else if (message.signIn === "close") finish({ signedIn: false, external: null });
    };
    const onAbort = () => finish({ signedIn: false, external: null }, true);
    window.addEventListener("message", onMessage);
    if (options.signal?.aborted) onAbort();
    else options.signal?.addEventListener("abort", onAbort, { once: true });
  });
}
function openSignInCard(options) {
  const theme = options.theme === "dark" ? "dark" : "light";
  const design = namedDesign(options.design);
  const styles = design ? { ...THEMES.dark, ...DESIGN_FRAMES[design] } : THEMES[theme];
  const queryForSignIn = () => {
    const query = new URLSearchParams();
    if (options.method) query.set("method", options.method);
    if (options.hint) query.set("hint", options.hint);
    if (theme === "dark") query.set("theme", "dark");
    if (design) query.set("design", design);
    return query;
  };
  const launcherQuery = () => {
    const query = queryForSignIn();
    query.set("to", "signin");
    return query;
  };
  return new Promise((resolve) => {
    void (async () => {
      let url;
      if (options.prepareSignIn) {
        try {
          const ticket = await options.prepareSignIn();
          const query = queryForSignIn();
          url = `${options.walletOrigin}${PATHS.signIn}${query.size ? `?${query}` : ""}#${ticket.id}.${ticket.key}`;
        } catch {
          url = `${options.walletOrigin}${PATHS.open}?${launcherQuery()}`;
        }
      } else {
        url = `${options.walletOrigin}${PATHS.open}?${launcherQuery()}`;
      }
      const overlay = document.createElement("div");
      overlay.style.cssText = `${styles.overlay}visibility:hidden;`;
      overlay.dataset.playnance = "sign-in";
      overlay.setAttribute("role", "presentation");
      overlay.setAttribute("aria-hidden", "true");
      const host = document.createElement("div");
      host.style.cssText = "position:relative;display:flex;max-width:100%;max-height:100%;";
      const frame = document.createElement("iframe");
      frame.title = "Connect with";
      frame.src = url;
      frame.style.cssText = `${styles.shell}position:absolute;visibility:hidden;pointer-events:none;height:720px;max-height:calc(100vh - 48px);`;
      frame.referrerPolicy = "no-referrer";
      frame.allow = "popups";
      frame.setAttribute(
        "sandbox",
        "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      );
      const dismiss = document.createElement("button");
      dismiss.type = "button";
      dismiss.setAttribute("aria-label", "Close sign in");
      dismiss.textContent = "\xD7";
      dismiss.style.cssText = styles.cancel;
      let settled = false;
      let connectingWallet = false;
      const finish = (outcome, byUser = false) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("message", onMessage);
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
        if (byUser) options.cancel?.();
        resolve(outcome);
      };
      const onMessage = (event) => {
        if (event.origin !== options.walletOrigin) return;
        const fromWalletFrame = event.source === walletFrame();
        const fromSignInIframe = event.source === frame.contentWindow;
        if (!fromWalletFrame && !fromSignInIframe) return;
        const message = event.data;
        if (!message || message.ns !== NAMESPACE) return;
        if ("connectWallet" in message && (message.connectWallet === "metamask" || message.connectWallet === "coinbase")) {
          if (!fromSignInIframe || !options.connectExternal || connectingWallet || settled) return;
          connectingWallet = true;
          const wallet = message.connectWallet;
          void options.connectExternal(wallet).then((result) => {
            connectingWallet = false;
            if (settled) return;
            if (result.ok) {
              finish({
                signedIn: true,
                external: { wallet, address: result.address, provider: result.provider }
              });
              return;
            }
            frame.contentWindow?.postMessage(
              { ns: NAMESPACE, connectWalletResult: { ok: false, message: result.message } },
              options.walletOrigin
            );
          });
          return;
        }
        if ("signInResize" in message && typeof message.signInResize === "number" && Number.isFinite(message.signInResize)) {
          const next = Math.max(1, Math.min(Math.ceil(message.signInResize), Math.floor(window.innerHeight - 48)));
          frame.style.height = `${next}px`;
          if (overlay.style.visibility === "hidden") {
            frame.style.position = "static";
            frame.style.visibility = "visible";
            frame.style.pointerEvents = "auto";
            overlay.style.visibility = "visible";
            overlay.removeAttribute("aria-hidden");
          }
          return;
        }
        if (!fromWalletFrame) return;
        if ("signIn" in message && message.signIn === "done") finish({ signedIn: true, external: null });
        else if ("signIn" in message && message.signIn === "close") finish({ signedIn: false, external: null });
      };
      const onKeyDown = (event) => {
        if (event.key === "Escape") finish({ signedIn: false, external: null }, true);
      };
      dismiss.addEventListener("click", () => finish({ signedIn: false, external: null }, true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) finish({ signedIn: false, external: null }, true);
      });
      window.addEventListener("message", onMessage);
      document.addEventListener("keydown", onKeyDown);
      host.append(frame, dismiss);
      overlay.appendChild(host);
      document.body.appendChild(overlay);
    })();
  });
}
function walletFrame() {
  try {
    return window.frames[FRAME_NAME] ?? null;
  } catch {
    return null;
  }
}
function openConfirmation(walletOrigin, confirmId, cancel, theme) {
  const mode = theme === "dark" ? "dark" : "light";
  const styles = THEMES[mode];
  const query = new URLSearchParams({ to: "confirm", origin: window.location.origin });
  if (mode === "dark") query.set("theme", "dark");
  const url = `${walletOrigin}${PATHS.open}?${query}#${confirmId}`;
  const overlay = document.createElement("div");
  overlay.style.cssText = styles.overlay;
  overlay.dataset.playnance = "confirm";
  overlay.setAttribute("role", "presentation");
  const host = document.createElement("div");
  host.style.cssText = "position:relative;display:flex;max-width:100%;max-height:100%;";
  const frame = document.createElement("iframe");
  frame.title = "Confirm in your wallet";
  frame.src = url;
  frame.style.cssText = `${styles.shell}min-height:0;height:280px;max-height:calc(100vh - 48px);`;
  frame.referrerPolicy = "no-referrer";
  frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms");
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.setAttribute("aria-label", "Close confirmation");
  dismiss.textContent = "\xD7";
  dismiss.style.cssText = styles.cancel;
  let settled = false;
  const finish = (byUser) => {
    if (settled) return;
    settled = true;
    window.removeEventListener("message", onMessage);
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
    if (byUser) cancel();
  };
  const onMessage = (event) => {
    if (event.origin !== new URL(walletOrigin).origin || event.source !== frame.contentWindow) return;
    const message = event.data;
    if (!message || message.ns !== NAMESPACE) return;
    if ("confirmResize" in message && typeof message.confirmResize === "number") {
      const next = Math.min(Math.ceil(message.confirmResize), Math.floor(window.innerHeight - 48));
      frame.style.height = `${Math.max(next, 1)}px`;
      return;
    }
    if ("confirmClose" in message && message.confirmClose) finish(false);
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") finish(true);
  };
  dismiss.addEventListener("click", () => finish(true));
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) finish(true);
  });
  window.addEventListener("message", onMessage);
  document.addEventListener("keydown", onKeyDown);
  host.append(frame, dismiss);
  overlay.appendChild(host);
  document.body.appendChild(overlay);
}
function openExport(walletOrigin, address, theme, design) {
  const named = namedDesign(design);
  const styles = named ? { ...THEMES.dark, ...DESIGN_FRAMES[named] } : THEMES[theme === "dark" ? "dark" : "light"];
  const query = new URLSearchParams({ embed: "1", origin: window.location.origin });
  if (address) query.set("address", address);
  if (theme === "dark") query.set("theme", "dark");
  if (named) query.set("design", named);
  const url = `${walletOrigin}${PATHS.export}?${query}`;
  const overlay = document.createElement("div");
  overlay.style.cssText = styles.overlay;
  overlay.dataset.playnance = "export-key";
  overlay.setAttribute("role", "presentation");
  const host = document.createElement("div");
  host.style.cssText = "position:relative;display:flex;max-width:100%;max-height:100%;";
  const frame = document.createElement("iframe");
  frame.title = "Export private key";
  frame.src = url;
  frame.style.cssText = `${styles.shell}min-height:0;height:280px;max-height:calc(100vh - 48px);width:min(520px,92vw);`;
  frame.referrerPolicy = "no-referrer";
  frame.allow = "popups";
  frame.setAttribute(
    "sandbox",
    "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
  );
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.setAttribute("aria-label", "Close export private key");
  dismiss.textContent = "\xD7";
  dismiss.style.cssText = styles.cancel;
  const finish = () => {
    window.removeEventListener("message", onMessage);
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
  };
  const onMessage = (event) => {
    if (event.origin !== new URL(walletOrigin).origin || event.source !== frame.contentWindow) return;
    const message = event.data;
    if (!message || message.ns !== NAMESPACE) return;
    if ("exportHello" in message && message.exportHello === true) {
      frame.contentWindow?.postMessage({ ns: NAMESPACE, exportHelloAck: true }, event.origin);
      return;
    }
    if ("exportResize" in message && typeof message.exportResize === "number") {
      const next = Math.min(Math.ceil(message.exportResize), Math.floor(window.innerHeight - 48));
      frame.style.height = `${Math.max(next, 1)}px`;
      return;
    }
    if ("exportClose" in message && message.exportClose) finish();
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") finish();
  };
  dismiss.addEventListener("click", () => finish());
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) finish();
  });
  window.addEventListener("message", onMessage);
  document.addEventListener("keydown", onKeyDown);
  host.append(frame, dismiss);
  overlay.appendChild(host);
  document.body.appendChild(overlay);
}
function openAccountMenu(anchor, options) {
  const menu = document.createElement("div");
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "Wallet account");
  menu.dataset.playnance = "account-menu";
  const box = anchor.getBoundingClientRect();
  const width = 260;
  const left = Math.max(8, Math.min(box.left, window.innerWidth - width - 8));
  menu.style.cssText = `position:fixed;z-index:2147483645;top:${box.bottom + 6}px;left:${left}px;width:${width}px;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid #e5e5e5;border-radius:12px;background:#fff;color:#0a0a0a;font:14px/1.5 ui-sans-serif,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.12);`;
  const who = document.createElement("div");
  who.textContent = options.label;
  who.style.cssText = "font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
  const address = document.createElement("div");
  address.textContent = `${options.address.slice(0, 8)}...${options.address.slice(-6)}`;
  address.title = options.address;
  address.style.cssText = "margin-top:-6px;color:#737373;font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;";
  const close = () => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("click", onOutside, true);
    menu.remove();
    options.onClose?.();
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") close();
  };
  const onOutside = (event) => {
    if (!menu.contains(event.target) && !anchor.contains(event.target)) close();
  };
  const item = (label, name, style, run) => {
    const node = document.createElement("button");
    node.type = "button";
    node.setAttribute("role", "menuitem");
    node.textContent = label;
    node.dataset.playnance = name;
    node.style.cssText = `${BUTTON}${style}height:40px;line-height:1;padding:0 12px;width:100%;`;
    node.addEventListener("click", () => {
      close();
      run();
    });
    return node;
  };
  menu.append(who, address);
  if (options.onExport) menu.append(item("Export private key", "export-key", PLAIN, options.onExport));
  menu.append(item("Sign out", "sign-out", PLAIN, options.onSignOut));
  document.body.appendChild(menu);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("click", onOutside, true);
  return close;
}

// authentication/wallet/kit/src/client.ts
var METHODS = {
  google: "google",
  email_passwordless: "email",
  sms_passwordless: "sms"
};
var CONNECTIONS = {
  google: "google",
  email: "email_passwordless",
  sms: "sms_passwordless"
};
var EXTERNAL_KEY = "playnance-wallet-external";
var PLAYBLOCK_KEY = "playnance-wallet-playblock";
var TOKEN_RENEW_SECONDS = 5 * 60;
var _walletOrigin, _clientId, _autoSignInVerify, _partnerRef, _attribution, _playblockApiUrl, _fetch2, _uiConfig, _channel2, _listeners2, _events, _state2, _token, _tokenRequest, _playblock, _playblockRequest, _pendingConnect, _abortSignIn, _signInActive, _windowCount, _external2, _externalUnlisten, _PlaynanceAuthClient_instances, onChain_fn, dialogTheme_fn, connect_fn, emit_fn2, apply_fn, ensureToken_fn, sessionForSite_fn, ensurePlayblock_fn, externalSession_fn, askExternal_fn, adoptExternal_fn, watchExternal_fn, restoreExternal_fn, rememberExternal_fn, clearExternal_fn, sessionPayload_fn;
var PlaynanceAuthClient = class {
  constructor(options, channel, deps = {}) {
    __privateAdd(this, _PlaynanceAuthClient_instances);
    /** The EIP-1193 provider, for ethers, viem or wagmi. */
    __publicField(this, "provider");
    /** Resolves when the wallet frame has answered and an existing sign-in is restored. */
    __publicField(this, "ready");
    __privateAdd(this, _walletOrigin);
    __privateAdd(this, _clientId);
    __privateAdd(this, _autoSignInVerify);
    __privateAdd(this, _partnerRef);
    __privateAdd(this, _attribution);
    __privateAdd(this, _playblockApiUrl);
    __privateAdd(this, _fetch2);
    __privateAdd(this, _uiConfig);
    __privateAdd(this, _channel2);
    __privateAdd(this, _listeners2, []);
    __privateAdd(this, _events, /* @__PURE__ */ new Map());
    __privateAdd(this, _state2, { status: "signed_out" });
    __privateAdd(this, _token, null);
    /** The identity token request that is out, if any (#ensureToken). */
    __privateAdd(this, _tokenRequest, null);
    /** Playblock's answer for the connected wallet, once its sign-in and verify calls have succeeded. */
    __privateAdd(this, _playblock, null);
    /** The Playblock sign-in that is out, if any (#ensurePlayblock). */
    __privateAdd(this, _playblockRequest, null);
    __privateAdd(this, _pendingConnect, null);
    /** Set while the attempt in progress runs in a window of its own ("Google only"). */
    __privateAdd(this, _abortSignIn, null);
    /** True between `signin:start` and `signin:end`. */
    __privateAdd(this, _signInActive, false);
    __privateAdd(this, _windowCount, 0);
    __privateAdd(this, _external2, null);
    __privateAdd(this, _externalUnlisten, null);
    const walletUrl = options?.walletUrl ?? options?.authUrl;
    if (!options || !options.clientId || !walletUrl) {
      throw new Error("PlaynanceAuth.init requires clientId and walletUrl");
    }
    __privateSet(this, _walletOrigin, new URL(walletUrl).origin);
    __privateSet(this, _clientId, options.clientId);
    __privateSet(this, _autoSignInVerify, options.autosigninverify !== false);
    __privateSet(this, _partnerRef, options.partnerRef?.trim() || void 0);
    __privateSet(this, _attribution, attributionFields(options.attribution));
    __privateSet(this, _playblockApiUrl, options.playblockApiUrl?.trim() || PLAYBLOCK_CUSTOMER_API);
    __privateSet(this, _fetch2, deps.fetch ?? ((input, init2) => fetch(input, init2)));
    __privateSet(this, _uiConfig, { ...options.uiConfig });
    if (options.connectDialogTheme) __privateGet(this, _uiConfig).mode = options.connectDialogTheme;
    __privateSet(this, _channel2, channel ?? createFrameChannel({
      walletOrigin: __privateGet(this, _walletOrigin),
      clientId: __privateGet(this, _clientId),
      onConfirm: (confirmId, cancel) => openConfirmation(__privateGet(this, _walletOrigin), confirmId, cancel, __privateMethod(this, _PlaynanceAuthClient_instances, dialogTheme_fn).call(this))
    }));
    this.provider = new WalletProvider({
      channel: __privateGet(this, _channel2),
      chains: (options.chains ?? [PLAYBLOCK]).map((chain) => ({ ...chain, chainId: Number(chain.chainId) })),
      defaultChainId: options.defaultChainId === void 0 ? void 0 : Number(options.defaultChainId),
      connect: () => this.connect()
    });
    __privateGet(this, _channel2).onState((state) => __privateMethod(this, _PlaynanceAuthClient_instances, apply_fn).call(this, state));
    this.ready = __privateGet(this, _channel2).ready.then(async (state) => {
      __privateMethod(this, _PlaynanceAuthClient_instances, apply_fn).call(this, state);
      if (state.status === "signed_out") await __privateMethod(this, _PlaynanceAuthClient_instances, restoreExternal_fn).call(this);
    });
    this.ready.catch(() => {
    });
  }
  /** `connected` once the wallet is usable, as in Web3Auth's kit. */
  get status() {
    return __privateGet(this, _state2).status === "connected" ? "connected" : "disconnected";
  }
  get connected() {
    return __privateGet(this, _state2).status === "connected";
  }
  /** Web3Auth's name for the same provider; null until connected. */
  get connection() {
    return this.connected ? { ethereumProvider: this.provider } : null;
  }
  /**
   * Modal flow (`@web3auth/modal`): opens the in-page connect dialog with every
   * sign-in method. Design comes from `uiConfig` on init or `setUiConfig`.
   */
  connect() {
    return __privateMethod(this, _PlaynanceAuthClient_instances, connect_fn).call(this, {});
  }
  /** Updates modal/sign-in chrome before the next `connect()` (`uiConfig` on Web3Auth). */
  setUiConfig(config) {
    __privateSet(this, _uiConfig, { ...__privateGet(this, _uiConfig), ...config });
  }
  /**
   * No-modal flow (`@web3auth/no-modal` `connectTo`): opens the dialog for one
   * provider only, without the method chooser.
   */
  connectTo(connectorOrOptions, options) {
    const chosen = typeof connectorOrOptions === "string" ? { authConnection: connectorOrOptions, ...options } : options ?? (connectorOrOptions ?? {});
    const method = chosen.authConnection ? METHODS[chosen.authConnection] : void 0;
    if (chosen.authConnection && !method) {
      return Promise.reject(new Error(`Unknown authConnection: ${chosen.authConnection}`));
    }
    return __privateMethod(this, _PlaynanceAuthClient_instances, connect_fn).call(this, { method, hint: chosen.loginHint });
  }
  async getSession() {
    await this.ready.catch(() => {
    });
    return __privateMethod(this, _PlaynanceAuthClient_instances, sessionForSite_fn).call(this);
  }
  onAuthStateChange(listener) {
    __privateGet(this, _listeners2).push(listener);
    return () => {
      const index = __privateGet(this, _listeners2).indexOf(listener);
      if (index >= 0) __privateGet(this, _listeners2).splice(index, 1);
    };
  }
  on(event, listener) {
    if (!__privateGet(this, _events).has(event)) __privateGet(this, _events).set(event, /* @__PURE__ */ new Set());
    __privateGet(this, _events).get(event).add(listener);
    return this;
  }
  off(event, listener) {
    __privateGet(this, _events).get(event)?.delete(listener);
    return this;
  }
  /** The identity token for this site's back end. Re-issued when close to expiry. */
  async getAuthTokenInfo() {
    await this.ready;
    if (!this.connected) throw new ProviderRpcError(ERRORS.unauthorized, "Connect the wallet first");
    if (isExternal(__privateGet(this, _state2))) {
      throw new ProviderRpcError(
        ERRORS.unsupportedMethod,
        "MetaMask and Coinbase Wallet do not have a Playnance identity token. Sign in with Google, email, or SMS for one."
      );
    }
    await __privateMethod(this, _PlaynanceAuthClient_instances, ensureToken_fn).call(this);
    if (!__privateGet(this, _token)) throw new ProviderRpcError(ERRORS.unauthorized, "Connect the wallet first");
    return { idToken: __privateGet(this, _token).idToken };
  }
  /** Web3Auth's name in kit version 10. */
  getIdentityToken() {
    return this.getAuthTokenInfo();
  }
  /** Web3Auth's name up to kit version 9. */
  authenticateUser() {
    return this.getAuthTokenInfo();
  }
  async getUserInfo() {
    const { idToken } = await this.getAuthTokenInfo();
    if (__privateGet(this, _state2).status !== "connected" || isExternal(__privateGet(this, _state2))) {
      throw new ProviderRpcError(ERRORS.unauthorized, "Connect the wallet first");
    }
    const { user } = __privateGet(this, _state2);
    return {
      email: user.email,
      name: user.name,
      profileImage: user.picture,
      phoneNumber: user.phoneNumber,
      authConnection: CONNECTIONS[user.method],
      userId: user.identifier,
      idToken
    };
  }
  /**
   * Ends the session in the wallet origin. With `forgetDevice`, for shared
   * computers, the wallet also deletes this browser's key share.
   */
  async logout(options = {}) {
    await this.ready.catch(() => {
    });
    if (isExternal(__privateGet(this, _state2))) {
      const provider = __privateGet(this, _external2);
      __privateMethod(this, _PlaynanceAuthClient_instances, clearExternal_fn).call(this);
      __privateMethod(this, _PlaynanceAuthClient_instances, apply_fn).call(this, { status: "signed_out" });
      if (provider) {
        void provider.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }).catch(() => {
        });
      }
      return;
    }
    const state = await __privateGet(this, _channel2).send({
      type: "logout",
      forgetDevice: options.forgetDevice === true
    });
    __privateMethod(this, _PlaynanceAuthClient_instances, apply_fn).call(this, state);
  }
  signOut() {
    return this.logout();
  }
  /**
   * Opens the wallet's export flow in a modal on this page. The key is shown
   * only inside the wallet-origin iframe and is never given to this site: this
   * call returns nothing.
   */
  exportPrivateKey() {
    if (isExternal(__privateGet(this, _state2))) return;
    openExport(
      __privateGet(this, _walletOrigin),
      __privateGet(this, _state2).status === "connected" ? __privateGet(this, _state2).address : void 0,
      __privateMethod(this, _PlaynanceAuthClient_instances, dialogTheme_fn).call(this),
      __privateGet(this, _uiConfig).design
    );
  }
  /**
   * What the wallet holds on the chain in use: the gas coin first, then the
   * chain's listed tokens. Read from the chain; nothing is asked of the wallet.
   */
  async getBalances() {
    const { chain, address } = __privateMethod(this, _PlaynanceAuthClient_instances, onChain_fn).call(this);
    const native = chain.nativeCurrency ?? { symbol: "native", decimals: 18 };
    const read = async (asset) => {
      const answer = asset.address ? await this.provider.request({
        method: "eth_call",
        params: [{ to: asset.address, data: encodeBalanceOf(address) }, "latest"]
      }) : await this.provider.request({ method: "eth_getBalance", params: [address, "latest"] });
      const value = BigInt(answer === "0x" ? "0x0" : answer);
      return {
        symbol: asset.symbol,
        address: asset.address ?? null,
        decimals: asset.decimals,
        value: value.toString(),
        formatted: formatUnits(value, asset.decimals)
      };
    };
    const balances = [];
    for (const asset of [native, ...chain.tokens ?? []]) balances.push(await read(asset));
    return balances;
  }
  /**
   * Sends an amount of the gas coin or of one of the chain's listed tokens to
   * an address. `amount` is in whole coins, as text: "12.5". The wallet shows
   * the user what is being sent and asks before it signs. Resolves with the
   * transaction hash once the chain has accepted the transaction for sending.
   */
  async transfer(request) {
    const { chain } = __privateMethod(this, _PlaynanceAuthClient_instances, onChain_fn).call(this);
    if (!isAddress(request.to)) {
      throw new ProviderRpcError(ERRORS.invalidParams, "The recipient is not an address");
    }
    const native = chain.nativeCurrency ?? { symbol: "native", decimals: 18 };
    const wanted = String(request.asset).toUpperCase();
    const token = (chain.tokens ?? []).find((item) => item.symbol.toUpperCase() === wanted);
    if (!token && wanted !== native.symbol.toUpperCase()) {
      throw new ProviderRpcError(ERRORS.invalidParams, `${request.asset} is not a coin of this chain`);
    }
    let amount;
    try {
      amount = parseUnits(request.amount, token ? token.decimals : native.decimals);
    } catch (error) {
      throw new ProviderRpcError(ERRORS.invalidParams, error.message);
    }
    if (amount <= 0n) throw new ProviderRpcError(ERRORS.invalidParams, "The amount must be more than zero");
    const tx = token ? { to: token.address, data: encodeTransfer(request.to, amount) } : { to: request.to, value: `0x${amount.toString(16)}` };
    const hash = await this.provider.request({ method: "eth_sendTransaction", params: [tx] });
    return {
      hash,
      explorerUrl: chain.explorerUrl ? `${chain.explorerUrl.replace(/\/$/, "")}/tx/${hash}` : null
    };
  }
  /**
   * Turns an element into the login widget's button. Signed out, a click opens
   * the login dialog. Connected, it shows who is signed in and a click opens a
   * menu with "Export private key" and "Sign out".
   */
  mount(selector) {
    const button = document.querySelector(selector);
    if (!button) throw new Error(`PlaynanceAuth.mount: ${selector} not found`);
    let closeMenu = null;
    const paint = (session) => {
      const user = session?.user;
      button.textContent = user ? user.email || user.phone || shortAddress(user.id) : "Connect";
      button.setAttribute("aria-haspopup", user ? "menu" : "dialog");
      closeMenu?.();
      closeMenu = null;
    };
    button.addEventListener("click", () => {
      if (closeMenu) return closeMenu();
      const state = __privateGet(this, _state2);
      if (state.status !== "connected") return void this.connect();
      const external = isExternal(state);
      closeMenu = openAccountMenu(button, {
        label: external ? state.user.name : state.user.email || state.user.phoneNumber || "Connected",
        address: state.address,
        onExport: external ? void 0 : () => this.exportPrivateKey(),
        onSignOut: () => void this.signOut(),
        onClose: () => closeMenu = null
      });
    });
    this.onAuthStateChange(paint);
    return this.getSession().then((session) => {
      paint(session);
      return session;
    });
  }
};
_walletOrigin = new WeakMap();
_clientId = new WeakMap();
_autoSignInVerify = new WeakMap();
_partnerRef = new WeakMap();
_attribution = new WeakMap();
_playblockApiUrl = new WeakMap();
_fetch2 = new WeakMap();
_uiConfig = new WeakMap();
_channel2 = new WeakMap();
_listeners2 = new WeakMap();
_events = new WeakMap();
_state2 = new WeakMap();
_token = new WeakMap();
_tokenRequest = new WeakMap();
_playblock = new WeakMap();
_playblockRequest = new WeakMap();
_pendingConnect = new WeakMap();
_abortSignIn = new WeakMap();
_signInActive = new WeakMap();
_windowCount = new WeakMap();
_external2 = new WeakMap();
_externalUnlisten = new WeakMap();
_PlaynanceAuthClient_instances = new WeakSet();
onChain_fn = function() {
  const chain = this.provider.chain;
  if (!chain) throw new ProviderRpcError(ERRORS.unknownChain, "No chain is configured for this wallet");
  if (__privateGet(this, _state2).status !== "connected") {
    throw new ProviderRpcError(ERRORS.unauthorized, "Connect the wallet first");
  }
  return { chain, address: __privateGet(this, _state2).address };
};
dialogTheme_fn = function() {
  return __privateGet(this, _uiConfig).mode === "dark" ? "dark" : "light";
};
connect_fn = function(target) {
  if (__privateGet(this, _pendingConnect)) {
    if (!__privateGet(this, _abortSignIn)) return __privateGet(this, _pendingConnect);
    __privateGet(this, _abortSignIn).abort();
  }
  let signInWindow = null;
  if (target.method === "google" && !this.connected) {
    signInWindow = window.open("about:blank", `${GOOGLE_WINDOW}-${++__privateWrapper(this, _windowCount)._}`, GOOGLE_WINDOW_FEATURES);
  }
  const abort = signInWindow ? new AbortController() : null;
  let windowSent = false;
  let attempt;
  let signedIn = false;
  if (!this.connected && !__privateGet(this, _signInActive)) {
    __privateSet(this, _signInActive, true);
    __privateMethod(this, _PlaynanceAuthClient_instances, emit_fn2).call(this, "signin:start", void 0);
  }
  attempt = (async () => {
    try {
      await this.ready;
      if (this.connected) {
        signedIn = true;
        return __privateMethod(this, _PlaynanceAuthClient_instances, sessionForSite_fn).call(this);
      }
      const opened = await openSignIn({
        walletOrigin: __privateGet(this, _walletOrigin),
        theme: __privateMethod(this, _PlaynanceAuthClient_instances, dialogTheme_fn).call(this),
        design: __privateGet(this, _uiConfig).design,
        ...target,
        signInWindow,
        onWindowSent: () => {
          windowSent = true;
        },
        signal: abort?.signal,
        prepareSignIn: () => __privateGet(this, _channel2).send({ type: "prepare_sign_in" }),
        cancel: () => void __privateGet(this, _channel2).send({ type: "close_windows" }).catch(() => {
        }),
        connectExternal: (wallet) => __privateMethod(this, _PlaynanceAuthClient_instances, askExternal_fn).call(this, wallet)
      });
      if (!opened.signedIn) return null;
      signedIn = true;
      if (opened.external) {
        __privateMethod(this, _PlaynanceAuthClient_instances, adoptExternal_fn).call(this, opened.external);
        return __privateMethod(this, _PlaynanceAuthClient_instances, sessionForSite_fn).call(this);
      }
      __privateMethod(this, _PlaynanceAuthClient_instances, apply_fn).call(this, await __privateGet(this, _channel2).send({ type: "hello" }));
      return __privateMethod(this, _PlaynanceAuthClient_instances, sessionForSite_fn).call(this);
    } finally {
      if (__privateGet(this, _pendingConnect) === attempt) {
        __privateSet(this, _pendingConnect, null);
        __privateSet(this, _abortSignIn, null);
        if (__privateGet(this, _signInActive)) {
          __privateSet(this, _signInActive, false);
          __privateMethod(this, _PlaynanceAuthClient_instances, emit_fn2).call(this, "signin:end", { signedIn });
        }
      }
      if (signInWindow && !windowSent) {
        try {
          signInWindow.close();
        } catch {
        }
      }
    }
  })();
  __privateSet(this, _pendingConnect, attempt);
  __privateSet(this, _abortSignIn, abort);
  return attempt;
};
/** Calls the listeners of an event. One that throws does not stop the sign-in or the other listeners. */
emit_fn2 = function(event, payload) {
  __privateGet(this, _events).get(event)?.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.error(`PlaynanceAuth "${event}" listener failed`, error);
    }
  });
};
apply_fn = function(state) {
  if (__privateGet(this, _external2)) {
    if (state.status === "signed_out") return;
    if (!isExternal(state)) __privateMethod(this, _PlaynanceAuthClient_instances, clearExternal_fn).call(this);
  }
  const before = __privateGet(this, _state2).status === "connected" ? __privateGet(this, _state2).address : null;
  const after = state.status === "connected" ? state.address : null;
  __privateSet(this, _state2, state);
  this.provider.update(state);
  if (before === after) return;
  __privateSet(this, _token, null);
  __privateSet(this, _tokenRequest, null);
  __privateSet(this, _playblock, null);
  __privateSet(this, _playblockRequest, null);
  if (before) writePlayblock(null);
  if (after) {
    void __privateMethod(this, _PlaynanceAuthClient_instances, sessionForSite_fn).call(this).then(
      (session) => {
        for (const listener of [...__privateGet(this, _listeners2)]) listener(session);
        __privateGet(this, _events).get("connected")?.forEach((listener) => listener(session ?? void 0));
      },
      // Nobody awaits this call, so a failed sign-in (Playblock's, or the identity token's) is reported as an event.
      (error) => __privateGet(this, _events).get("error")?.forEach((listener) => listener(error))
    );
    return;
  }
  for (const listener of [...__privateGet(this, _listeners2)]) listener(null);
  __privateGet(this, _events).get("disconnected")?.forEach((listener) => listener(void 0));
};
ensureToken_fn = async function() {
  if (__privateGet(this, _state2).status !== "connected" || isExternal(__privateGet(this, _state2))) return;
  const now = Math.floor(Date.now() / 1e3);
  if (__privateGet(this, _token) && __privateGet(this, _token).expiresAt - now >= TOKEN_RENEW_SECONDS) return;
  let request = __privateGet(this, _tokenRequest);
  if (!request) {
    request = __privateGet(this, _channel2).send({
      type: "identity_token",
      ...__privateGet(this, _partnerRef) ? { partnerRef: __privateGet(this, _partnerRef) } : {}
    });
    __privateSet(this, _tokenRequest, request);
  }
  try {
    const token = await request;
    if (__privateGet(this, _tokenRequest) === request) {
      __privateSet(this, _tokenRequest, null);
      __privateSet(this, _token, token);
    }
  } catch (error) {
    if (__privateGet(this, _tokenRequest) === request) __privateSet(this, _tokenRequest, null);
    throw error;
  }
};
sessionForSite_fn = async function() {
  if (__privateGet(this, _state2).status !== "connected") return null;
  if (isExternal(__privateGet(this, _state2))) {
    if (__privateGet(this, _autoSignInVerify)) await __privateMethod(this, _PlaynanceAuthClient_instances, ensurePlayblock_fn).call(this);
    const state = __privateGet(this, _state2);
    if (!isExternal(state) || __privateGet(this, _autoSignInVerify) && !__privateGet(this, _playblock)) return null;
    return __privateMethod(this, _PlaynanceAuthClient_instances, externalSession_fn).call(this, state);
  }
  await __privateMethod(this, _PlaynanceAuthClient_instances, ensureToken_fn).call(this);
  if (!__privateGet(this, _token)) return null;
  if (__privateGet(this, _autoSignInVerify)) await __privateMethod(this, _PlaynanceAuthClient_instances, ensurePlayblock_fn).call(this);
  if (__privateGet(this, _state2).status !== "connected" || __privateGet(this, _autoSignInVerify) && !__privateGet(this, _playblock)) return null;
  return __privateMethod(this, _PlaynanceAuthClient_instances, sessionPayload_fn).call(this);
};
ensurePlayblock_fn = async function() {
  const state = __privateGet(this, _state2);
  if (!__privateGet(this, _autoSignInVerify) || state.status !== "connected" || __privateGet(this, _playblock)) return;
  let request = __privateGet(this, _playblockRequest);
  if (!request) {
    const kept = readPlayblock(__privateGet(this, _clientId), state.address);
    if (kept) {
      __privateSet(this, _playblock, kept);
      return;
    }
  }
  if (!request) {
    const account = isExternal(state) ? void 0 : state;
    request = playblockSignIn({
      apiUrl: __privateGet(this, _playblockApiUrl),
      wallet: state.address,
      // Playblock names MetaMask in camel case.
      walletProvider: isExternal(state) ? state.external === "metamask" ? "metaMask" : state.external : CONNECTIONS[state.user.method],
      uri: globalThis.location?.href ?? "",
      appId: __privateGet(this, _clientId),
      partnerRef: __privateGet(this, _partnerRef),
      attribution: __privateGet(this, _attribution),
      email: account?.user.email,
      avatarUrl: account?.user.picture,
      // MetaMask and Coinbase have no Playnance identity token; the signature proves the wallet.
      idToken: account ? __privateGet(this, _token)?.idToken : void 0,
      sign: async (message) => await this.provider.request({ method: "personal_sign", params: [toHex(message), state.address] }),
      fetch: __privateGet(this, _fetch2)
    });
    __privateSet(this, _playblockRequest, request);
  }
  try {
    const result = await request;
    if (__privateGet(this, _playblockRequest) === request) {
      __privateSet(this, _playblockRequest, null);
      __privateSet(this, _playblock, result);
      writePlayblock({ clientId: __privateGet(this, _clientId), address: state.address, session: result });
    }
  } catch (error) {
    if (__privateGet(this, _playblockRequest) === request) __privateSet(this, _playblockRequest, null);
    throw error;
  }
};
externalSession_fn = function(state) {
  return {
    user: {
      id: state.address,
      user_metadata: { name: state.user.name, full_name: state.user.name },
      app_metadata: { provider: state.external }
    },
    wallet: { address: state.address, publicKey: "" },
    ...__privateGet(this, _playblock) ? { playblock: __privateGet(this, _playblock) } : {}
  };
};
askExternal_fn = async function(wallet) {
  try {
    const ethereum = globalThis.ethereum;
    const { provider, address } = await requestExternalAccount(ethereum, wallet, this.provider.chain);
    return { ok: true, address, provider };
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "The wallet could not be connected.";
    return { ok: false, message };
  }
};
adoptExternal_fn = function(connection) {
  __privateMethod(this, _PlaynanceAuthClient_instances, clearExternal_fn).call(this);
  __privateSet(this, _external2, connection.provider);
  this.provider.useExternal(connection.provider);
  __privateMethod(this, _PlaynanceAuthClient_instances, rememberExternal_fn).call(this, connection.wallet, connection.address);
  __privateMethod(this, _PlaynanceAuthClient_instances, watchExternal_fn).call(this, connection.provider, connection.wallet);
  __privateMethod(this, _PlaynanceAuthClient_instances, apply_fn).call(this, {
    status: "connected",
    external: connection.wallet,
    address: connection.address,
    publicKey: "",
    user: {
      method: connection.wallet,
      identifier: connection.address,
      name: externalWalletLabel(connection.wallet)
    }
  });
};
watchExternal_fn = function(provider, wallet) {
  const onAccounts = (accounts) => {
    if (!isExternal(__privateGet(this, _state2)) || __privateGet(this, _state2).external !== wallet) return;
    const list = Array.isArray(accounts) ? accounts.filter((item) => isAddress(item)) : [];
    if (list.length === 0) {
      __privateMethod(this, _PlaynanceAuthClient_instances, clearExternal_fn).call(this);
      __privateMethod(this, _PlaynanceAuthClient_instances, apply_fn).call(this, { status: "signed_out" });
      return;
    }
    const address = list[0];
    if (address.toLowerCase() === __privateGet(this, _state2).address.toLowerCase()) return;
    __privateMethod(this, _PlaynanceAuthClient_instances, rememberExternal_fn).call(this, wallet, address);
    __privateMethod(this, _PlaynanceAuthClient_instances, apply_fn).call(this, {
      status: "connected",
      external: wallet,
      address,
      publicKey: "",
      user: { method: wallet, identifier: address, name: externalWalletLabel(wallet) }
    });
  };
  const onChain = (chainId) => {
    if (typeof chainId === "string") this.provider.adoptChain(chainId);
  };
  provider.on("accountsChanged", onAccounts);
  provider.on("chainChanged", onChain);
  __privateSet(this, _externalUnlisten, () => {
    provider.removeListener("accountsChanged", onAccounts);
    provider.removeListener("chainChanged", onChain);
  });
};
restoreExternal_fn = async function() {
  const saved = readExternal();
  if (!saved) return;
  const provider = providerFor(globalThis.ethereum, saved.wallet);
  if (!provider) return;
  let accounts;
  try {
    accounts = await provider.request({ method: "eth_accounts" });
  } catch {
    return;
  }
  const still = Array.isArray(accounts) && accounts.some((item) => typeof item === "string" && item.toLowerCase() === saved.address.toLowerCase());
  if (!still) {
    writeExternal(null);
    return;
  }
  if (__privateGet(this, _state2).status === "connected") return;
  __privateMethod(this, _PlaynanceAuthClient_instances, adoptExternal_fn).call(this, { wallet: saved.wallet, address: saved.address, provider });
};
rememberExternal_fn = function(wallet, address) {
  writeExternal({ wallet, address });
};
clearExternal_fn = function() {
  var _a;
  (_a = __privateGet(this, _externalUnlisten)) == null ? void 0 : _a.call(this);
  __privateSet(this, _externalUnlisten, null);
  __privateSet(this, _external2, null);
  this.provider.useExternal(null);
  writeExternal(null);
};
sessionPayload_fn = function() {
  if (__privateGet(this, _state2).status !== "connected" || isExternal(__privateGet(this, _state2))) {
    throw new ProviderRpcError(ERRORS.unauthorized, "Connect the wallet first");
  }
  const { user, address, publicKey } = __privateGet(this, _state2);
  return {
    user: {
      id: address,
      email: user.email,
      phone: user.phoneNumber,
      user_metadata: {
        full_name: user.name,
        name: user.name,
        avatar_url: user.picture,
        picture: user.picture
      },
      app_metadata: { provider: user.method }
    },
    wallet: { address, publicKey },
    jwt: __privateGet(this, _token).idToken,
    ...__privateGet(this, _playblock) ? { playblock: __privateGet(this, _playblock) } : {}
  };
};
function isExternal(state) {
  return state.status === "connected" && "external" in state;
}
function shortAddress(value) {
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}
function browserStorage() {
  try {
    const storage = globalThis.sessionStorage;
    return storage && typeof storage.getItem === "function" ? storage : null;
  } catch {
    return null;
  }
}
function readExternal() {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(EXTERNAL_KEY) ?? "null");
    if (!parsed || parsed.wallet !== "metamask" && parsed.wallet !== "coinbase" || !isAddress(parsed.address)) {
      return null;
    }
    return { wallet: parsed.wallet, address: parsed.address };
  } catch {
    return null;
  }
}
function readPlayblock(clientId, address) {
  const storage = browserStorage();
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(PLAYBLOCK_KEY) ?? "null");
    const session = parsed?.session;
    if (!parsed || parsed.clientId !== clientId || typeof parsed.address !== "string" || parsed.address.toLowerCase() !== address.toLowerCase() || !session || typeof session.accessToken !== "string" || !session.accessToken || jwtExpired(session.accessToken)) {
      return null;
    }
    const record = (value) => value && typeof value === "object" ? value : {};
    return { accessToken: session.accessToken, profile: record(session.profile), meta: record(session.meta) };
  } catch {
    return null;
  }
}
function writePlayblock(value) {
  const storage = browserStorage();
  if (!storage) return;
  try {
    if (value) storage.setItem(PLAYBLOCK_KEY, JSON.stringify(value));
    else storage.removeItem(PLAYBLOCK_KEY);
  } catch {
  }
}
function jwtExpired(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" && json.exp * 1e3 <= Date.now() + 3e4;
  } catch {
    return false;
  }
}
function writeExternal(value) {
  const storage = browserStorage();
  if (!storage) return;
  try {
    if (value) storage.setItem(EXTERNAL_KEY, JSON.stringify(value));
    else storage.removeItem(EXTERNAL_KEY);
  } catch {
  }
}

// authentication/wallet/kit/src/index.ts
function init(options) {
  return new PlaynanceAuthClient(options);
}
export {
  PLAYBLOCK,
  PlaynanceAuthClient,
  ProviderRpcError,
  WalletProvider,
  formatUnits,
  init,
  parseUnits
};
