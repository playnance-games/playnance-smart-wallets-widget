/* Published example page. Loads the wallet frame from https://wo.playnance.com/frame.html. */
/* What a consuming site writes. Results are kept on window for the test to read. */
const RECIPIENT = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
const TOKEN = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
const out = document.getElementById("out")
const results = (window.results = {})

const CONNECT_THEME = (() => {
  const fromUrl = new URLSearchParams(window.location.search).get("theme")
  return fromUrl === "dark" ? "dark" : "light"
})()
document.documentElement.dataset.siteTheme = CONNECT_THEME

// Look of the connect modal and of the single-method connects (no-modal).
const CONNECT_DESIGNS = ["regular", "space", "cyberpunk", "gta", "bossclub"]
const CONNECT_DESIGN = (() => {
  const fromUrl = new URLSearchParams(window.location.search).get("design")
  return CONNECT_DESIGNS.includes(fromUrl) ? fromUrl : "regular"
})()

const auth = (window.auth = PlaynanceAuth.init({
  clientId: "playnance-dev",
  walletUrl: "https://wo.playnance.com",
  partnerRef: "PLnAI",
  uiConfig: { mode: CONNECT_THEME, design: CONNECT_DESIGN },
}))

const themeSwitch = document.getElementById("theme-switch")
function applyTheme(mode) {
  document.documentElement.dataset.siteTheme = mode
  const dark = mode === "dark"
  themeSwitch.setAttribute("aria-checked", dark ? "true" : "false")
  themeSwitch.querySelector(".theme-switch-value").textContent = dark ? "Dark" : "Light"
  auth.setUiConfig({ mode })
  const url = new URL(window.location.href)
  if (dark) url.searchParams.set("theme", "dark")
  else url.searchParams.delete("theme")
  history.replaceState(null, "", url.pathname + url.search + url.hash)
}
applyTheme(CONNECT_THEME)
themeSwitch.addEventListener("click", () => {
  applyTheme(themeSwitch.getAttribute("aria-checked") === "true" ? "light" : "dark")
})

const designSelect = document.getElementById("design-select")
function applyDesign(design) {
  designSelect.value = design
  auth.setUiConfig({ design })
  const url = new URL(window.location.href)
  if (design === "regular") url.searchParams.delete("design")
  else url.searchParams.set("design", design)
  history.replaceState(null, "", url.pathname + url.search + url.hash)
}
applyDesign(CONNECT_DESIGN)
designSelect.addEventListener("change", () => applyDesign(designSelect.value))

const CONNECT_BTNS = ["account", "connect", "connect-google", "connect-email", "connect-sms"]
const SESSION_BTNS = ["sign", "typed", "send", "approve-token", "export", "balances", "logout", "copy-address"]

function setConnected(connected) {
  for (const id of CONNECT_BTNS) {
    const node = document.getElementById(id)
    if (node) node.disabled = connected
  }
  for (const id of SESSION_BTNS) {
    const node = document.getElementById(id)
    if (node) node.disabled = !connected
  }
  const form = document.getElementById("transfer")
  if (form) {
    for (const el of form.querySelectorAll("input, select, button")) el.disabled = !connected
  }
}

function record(name, work) {
  delete results[name]
  return Promise.resolve()
    .then(work)
    .then(
      (value) => (results[name] = { ok: true, value }),
      (error) => (results[name] = { ok: false, code: error.code, message: error.message })
    )
    .then(() => (out.textContent = `${name}: ${JSON.stringify(results[name], null, 2)}`))
}
window.record = record

const account = async () => (await auth.provider.request({ method: "eth_accounts" }))[0]
const toHex = (text) =>
  "0x" + Array.from(new TextEncoder().encode(text), (byte) => byte.toString(16).padStart(2, "0")).join("")

const show = (id, text) => (document.getElementById(id).textContent = text)
async function paintWallet(session) {
  const chain = auth.provider.chain
  show("chain-name", chain.name ?? `chain ${chain.chainId}`)
  show("address", session ? session.wallet.address : "not connected")
  const coins = [chain.nativeCurrency?.symbol ?? "native", ...(chain.tokens ?? []).map((token) => token.symbol)]
  document.getElementById("asset").replaceChildren(...coins.map((coin) => new Option(coin, coin)))
  // A MetaMask or Coinbase connection can be live while the session is null (Playblock's sign-in
  // not finished or failed), so the provider's account decides too.
  const external = await account().catch(() => undefined)
  setConnected(Boolean(session) || Boolean(external))
  paintExternal(session)
}
// MetaMask and Coinbase are not Playnance accounts (no email, no identity token), so the
// session only carries the wallet. Show what the page knows about it.
function paintExternal(session) {
  const details = document.getElementById("external-details")
  const wallet = session?.user.app_metadata.provider
  if (!session || (wallet !== "metamask" && wallet !== "coinbase")) {
    details.hidden = true
    details.replaceChildren()
    return
  }
  const chain = auth.provider.chain
  const profile = session.playblock?.profile
  const rows = [
    ["Wallet", session.user.user_metadata.name || wallet],
    ["Address", session.wallet.address],
    ["Chain", `${chain.name ?? "chain"} (${chain.chainId})`],
    ["Identity token", session.jwt ? "yes" : "none (external wallet)"],
    ["Playblock", profile ? `signed in (${profile.displayName || profile.id})` : "not signed in"],
  ]
  details.replaceChildren(
    ...rows.flatMap(([key, value]) => {
      const term = document.createElement("dt")
      term.textContent = key
      const definition = document.createElement("dd")
      definition.textContent = String(value)
      return [term, definition]
    })
  )
  details.hidden = false
}
// The signed-in user's avatar and name (a Google account has both). The session
// carries them in user_metadata. Once Playblock's verify call has answered,
// session.playblock.profile has the account Playblock keeps, and that wins.
const PROFILE_FIELDS = [
  ["id", "Id"],
  ["displayName", "Display name"],
  ["countryCode", "Country"],
  ["partnerRef", "Partner"],
  ["role", "Role"],
  ["enabled", "Enabled"],
]
function paintProfile(session) {
  const box = document.getElementById("profile")
  const details = document.getElementById("profile-details")
  const meta = session?.user.user_metadata ?? {}
  const profile = session?.playblock?.profile
  const name = profile?.displayName || meta.full_name || meta.name || ""
  const picture = profile?.avatarUrl || meta.avatar_url || meta.picture || ""
  if (!session || (!name && !picture && !profile)) {
    box.hidden = true
    return
  }
  const label = name || session.user.email || "Signed in"
  const initials = document.createElement("span")
  initials.className = "profile-avatar profile-initials"
  initials.textContent = label.trim().charAt(0).toUpperCase()
  initials.setAttribute("aria-hidden", "true")
  let avatar = initials
  if (/^https:\/\//i.test(picture)) {
    avatar = document.createElement("img")
    avatar.className = "profile-avatar"
    avatar.alt = ""
    avatar.width = avatar.height = 44
    // Google's image host refuses some referrers; this page sends none.
    avatar.referrerPolicy = "no-referrer"
    avatar.addEventListener("error", () => avatar.replaceWith(initials), { once: true })
    avatar.src = picture
  }
  document.getElementById("profile-avatar-slot").replaceChildren(avatar)
  show("profile-name", label)
  show("profile-email", session.user.email && session.user.email !== label ? session.user.email : "")
  details.replaceChildren()
  if (profile) {
    for (const [key, field] of PROFILE_FIELDS) {
      const value = profile[key]
      const term = document.createElement("dt")
      term.textContent = field
      const definition = document.createElement("dd")
      definition.textContent = value == null || value === "" ? "—" : String(value)
      details.append(term, definition)
    }
    details.hidden = false
  } else {
    details.hidden = true
  }
  box.hidden = false
}

const signInLoader = document.getElementById("sign-in-loader")
const signInLoaderText = document.getElementById("sign-in-loader-text")
function showLoader(text) {
  signInLoaderText.textContent = text
  signInLoader.hidden = false
}
auth.on("signin:start", () => showLoader("Loading..."))
auth.on("signin:end", () => {
  signInLoader.hidden = true
})

// A reload restores the session, but the wallet frame answers a moment after the page loads, and
// Playblock's sign-in follows. The page cannot know before then whether anyone is signed in, so it
// keeps a hint of whether it was, and shows the loader only for a visit that was.
const SIGNED_IN_HINT = "e2e-site-signed-in"
const readHint = () => {
  try {
    return localStorage.getItem(SIGNED_IN_HINT) === "1"
  } catch {
    return false
  }
}
const writeHint = (signedIn) => {
  try {
    if (signedIn) localStorage.setItem(SIGNED_IN_HINT, "1")
    else localStorage.removeItem(SIGNED_IN_HINT)
  } catch {
    // Storage is unavailable: the loader just does not show on reload.
  }
}
let restoring = readHint()
if (restoring) showLoader("Signing you in...")

auth.provider.on("chainChanged", () => auth.getSession().then(paintWallet))
auth.onAuthStateChange((session) => {
  window.lastSession = session
  writeHint(Boolean(session))
  paintWallet(session)
  paintProfile(session)
})
auth
  .getSession()
  .then((session) => {
    writeHint(Boolean(session))
    paintWallet(session)
    paintProfile(session)
  })
  .finally(() => {
    // Signed in, signed out, or failed: the restore is over.
    if (!restoring) return
    restoring = false
    signInLoader.hidden = true
  })

document.getElementById("balances").onclick = () =>
  record("balances", async () => {
    const balances = await auth.getBalances()
    show("balance-list", balances.map((item) => `${item.symbol.padEnd(6)} ${item.formatted}`).join("\n"))
    return balances
  })

document.getElementById("copy-address").onclick = () =>
  record("copyAddress", async () => {
    const address = document.getElementById("address").textContent.trim()
    if (address === "not connected") throw new Error("Not connected")
    await navigator.clipboard.writeText(address)
    return { copied: address }
  })

document.getElementById("transfer").onsubmit = (event) => {
  event.preventDefault()
  const result = document.getElementById("transfer-result")
  result.textContent = "Waiting for the wallet..."
  record("transfer", async () => {
    try {
      const sent = await auth.transfer({
        asset: document.getElementById("asset").value,
        to: document.getElementById("to").value.trim(),
        amount: document.getElementById("amount").value.trim(),
      })
      result.textContent = "Sent: "
      const link = document.createElement(sent.explorerUrl ? "a" : "code")
      link.textContent = sent.hash
      if (sent.explorerUrl) Object.assign(link, { href: sent.explorerUrl, target: "_blank", rel: "noreferrer" })
      result.append(link)
      return sent
    } catch (error) {
      result.textContent = `Not sent: ${error.message}`
      throw error
    }
  })
}
record("ready", () => auth.ready.then(() => auth.getSession()))

auth.mount("#account")
document.getElementById("export").onclick = () => record("export", () => auth.exportPrivateKey() ?? null)
document.getElementById("connect").onclick = () => record("connect", () => auth.connect())
document.getElementById("connect-google")?.addEventListener("click", () =>
  record("connectGoogle", () => auth.connectTo({ authConnection: "google" }))
)
document.getElementById("connect-email")?.addEventListener("click", () =>
  record("connectEmail", () => auth.connectTo({ authConnection: "email_passwordless" }))
)
document.getElementById("connect-sms")?.addEventListener("click", () =>
  record("connectSms", () => auth.connectTo("sms_passwordless"))
)
document.getElementById("logout").onclick = () => record("logout", () => auth.logout())
document.getElementById("sign").onclick = () =>
  record("sign", async () =>
    auth.provider.request({
      method: "personal_sign",
      params: [toHex("Hello from the example site"), await account()],
    })
  )
document.getElementById("typed").onclick = () =>
  record("typed", async () =>
    auth.provider.request({
      method: "eth_signTypedData_v4",
      params: [await account(), JSON.stringify(window.TYPED_DATA)],
    })
  )
document.getElementById("send").onclick = () =>
  record("send", () =>
    auth.provider.request({
      method: "eth_sendTransaction",
      params: [{ to: RECIPIENT, value: "0x2386f26fc10000" }],
    })
  )
document.getElementById("approve-token").onclick = () =>
  record("approveToken", () =>
    auth.provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          to: TOKEN,
          data:
            "0x095ea7b3000000000000000000000000" +
            RECIPIENT.slice(2).toLowerCase() +
            (1000).toString(16).padStart(64, "0"),
        },
      ],
    })
  )

window.TYPED_DATA = {
  domain: { name: "Example game", version: "1", chainId: 31337, verifyingContract: TOKEN },
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    Bet: [
      { name: "round", type: "uint256" },
      { name: "player", type: "address" },
    ],
  },
  primaryType: "Bet",
  message: { round: "7", player: RECIPIENT },
}