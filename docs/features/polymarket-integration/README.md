# Polymarket Integration via Safe Wallet

## 📌 Use Case
Execute trades on **Polymarket** using a **Safe Wallet** (multisig contract) for secure, auditable governance.

---

## ⚙️ How Polymarket Works

### Accounts and Signature Types
Polymarket supports three signature types for interacting with its contracts:

1. **EOA (Externally Owned Account)**  
   - Example: MetaMask or other browser wallets  
   - It is represented by **Signature Type 0** in the payload that is sent to the CLOB when placing a bet

2. **Magic Link (Proxy Wallet)**  
   - Login via email or social credentials  
   - Polymarket deploys a **Proxy Wallet** for you  
   - It is represented by **Signature Type 1** in the payload that is sent to the CLOB when placing a bet

3. **Safe Wallet (Multisig Contract)**  
   - Custom Safe implementation deployed via Polymarket’s Safe Factory when a user connects their wallet to the Polymarket app  
   - It is represented by **Signature Type 2** in the payload that is sent to the CLOB when placing a bet

---

## 🔐 Safe Wallet in the Context of Polymarket

- Polymarket deploys a **custom Safe implementation** for each user who connects their wallet to the Polymarket platform.  
- The Safe Wallet address is **deterministically derived** from the user’s MetaMask EOA.  
  - This means the same EOA will always map to the same Safe address, whether created via the web interface or SDK.  
- Each Safe Wallet is a **1‑of‑1 Safe** (single owner, threshold = 1).  
- The Safe acts as the execution layer for trades, while the EOA provides signatures.
- It is possible to mutate or customise the Safe to add more owners and increase the threshold etc.
- It is not possible to enforce multisig approvals when placing bets because of the architecture of the Polymarket CLOB and CFT Exchange contracts.
- It is possible to interact with this Safe{Wallet} using the Safe{Wallet} SDK.

---

## 📈 Making Orders

- Orders are placed through Polymarket’s **Central Limit Order Book (CLOB)**.  
- The CLOB is exposed via HTTPS at: https://clob.polymarket.com

- To place an order:
  1. Construct an **EIP‑712** data structure with the order details.  
  2. Sign it using the EOA that owns the Safe Wallet (The one from which the Safe is derived).  
  3. Submit it via a `POST` request to the CLOB endpoint.

- The payload includes:
  - **Safe Wallet address**  
  - **EOA address**  
  - **Signature**
  - **Signature Type**

- **Validation rule:** If the Safe Wallet address in the payload does not match the deterministically derived Safe address for the provided EOA, the order will fail validation.

---

## ✅ Approvals

Before trading, you must approve Polymarket contracts to spend tokens on your behalf. This is a **one‑time setup** step:

| Contract Name            | Address                                    | Purpose |
|---------------------------|--------------------------------------------|---------|
| **CTF Contract**          | `0x4d97dcd97ec945f40cf65f87097ace5ea0476045` | Core Conditional Token Framework |
| **CTF Exchange**          | `0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E` | Standard trading exchange |
| **Neg Risk CTF Exchange** | `0xC5d563A36AE78145C45a50134d48A1215220f80a` | Negative risk trading exchange |
| **Neg Risk Adapter**      | `0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296` | Adapter for negative risk positions |

- Once approvals are granted, **no further approvals are required** for subsequent trades.  
- This ensures smooth execution of orders without repeated authorization prompts.
- This is the only operation that requires multisig approval on the Polymarket side
  - This means once the approvals are made the EOA owner from which the Safe is deterministically derived can trade without requiring other owners of the Safe to approve.

---

## 🎯 Key Takeaways

- Polymarket integrates Safe Wallets as **deterministic 1‑of‑1 multisigs**.  
- Orders are validated against the Safe Wallet ↔ EOA mapping.  
- Approvals are a one‑time setup across core Polymarket contracts.  
- The Safe Wallet provides a secure, auditable layer for executing trades while preserving EOA signature authority.
