# CNC Accounting — Full Test Scenario

One continuous scenario to exercise **every** money flow of the CNC, from 1 to N. Do each step in order. Keep amounts small so the maths
stays easy to check. Extends the Sprint Script in [#2255](https://github.com/globe-and-citizen/cnc-portal/issues/2255) to cover all use
cases.

- [ ] **1.** Create a team with the six contracts deployed (Bank, FeeCollector, CashRemuneration, ExpenseAccount, InvestorV1,
      SafeDepositRouter + Safe).
- [ ] **2.** A founder deposits **$4** into the **Bank**.
- [ ] **3.** Hermann, Georges and Achille each **invest $2** and get SHER (2 SHER for $2) via the **SafeDepositRouter**.
- [ ] **4.** A member sends **$2 straight to the Safe** (no router) to invest.
- [ ] **5.** **Mint 10% of SHER to Ravi** directly, no charge.
- [ ] **6.** Georginio works **2h @ $1/h + 1 SHER/h** — submit the claim.
- [ ] **7.** Georginio **withdraws** his pay.
- [ ] **8.** Achille works **1h @ $1/h + 2 SHER/h** — submit the claim, then **withdraw**.
- [ ] **9.** Ravi works **1h @ $1/h + 2 SHER/h** — submit the claim, then **withdraw**.
- [ ] **10.** Pay one wage in **two tokens at once** (USDC + POL) — submit and **withdraw**.
- [ ] **11.** The external **client pays $3** into the **Bank** (service).
- [ ] **12.** The external **client pays in native POL** into the **Bank**.
- [ ] **13.** **Bump the router SHER multiplier** (change the SHER price).
- [ ] **14.** Ravi **withdraws $0.50 from the Safe** to a personal address.
- [ ] **15.** Ravi **withdraws $0.75 from the Bank** to a personal address.
- [ ] **16.** Transfer **$2 Bank → Payroll**.
- [ ] **17.** Transfer **$2 Bank → Expense**.
- [ ] **18.** Approve a **one-time** expense budget for Hermann; Hermann **withdraws $1.25**.
- [ ] **19.** Approve a **recurring (weekly)** budget and **withdraw part** of it.
- [ ] **20.** Send **$0.75 back from Expense to Bank**.
- [ ] **21.** Open a **debt issuance** to raise **$8**.
- [ ] **22.** Achille, Ravi, Hermann and Georges each **lend $2 @ 4% for 1 day**.
- [ ] **23.** The funded offer **sweeps its principal to the Bank**.
- [ ] **24.** Ravi **releases the funds to repay** the lenders with interest.
- [ ] **25.** (Optional) Open another offer that **misses its target** and **refund** the principal.
- [ ] **26.** Ravi **sweeps Payroll → Bank and Expense → Bank** to reconcile.
- [ ] **27.** Ravi **pays a dividend** to the shareholders of whatever is left.
- [ ] **28.** Add a **memo** on one deposit and one withdrawal.
- [ ] **29.** Open the **ledger**: search rows, filter by each category, toggle column visibility, paginate.
- [ ] **30.** Open a **line drill-down** (loupe / Details) on an account.
- [ ] **31.** **Export** the ledger / a statement.
- [ ] **32.** Refresh and re-open the page on an **empty team**, and with a **failed / NFT** transfer present.
