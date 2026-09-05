# CNC Accounting — Full Test Scenario

One continuous scenario to exercise **every** money flow of the CNC, from 1 to N. Do each step in order. Keep amounts small so the maths
stays easy to check. Extends the Sprint Script in [#2255](https://github.com/globe-and-citizen/cnc-portal/issues/2255) to cover all use
cases.

- [ ] **1.** Create a team with the six contracts deployed (Bank, FeeCollector, CashRemuneration, ExpenseAccount, InvestorV1,
      SafeDepositRouter + Safe).
- [ ] **2.** An external party deposits **$4** into the **Bank** as service revenue.
- [ ] **3.** Hermann, Georges and Achille each **invest $2** and get SHER (2 SHER for $2) via the **SafeDepositRouter**.
- [ ] **4.** A member sends **$2 straight to the Safe** (no router) as service revenue.
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
- [ ] **21.** Open a **Community Credit borrowing round** to raise **$8**.
- [ ] **22.** Achille, Ravi, Hermann and Georges each **lend $2 @ 4% for 1 day**.
- [ ] **23.** The funded offer **sweeps its principal to the Bank**.
- [ ] **24.** Ravi **releases the funds to repay** the lenders with interest.
- [ ] **25.** (Optional) Open another offer that **misses its target** and **refund** the principal.
- [ ] **26.** Ravi **sweeps Payroll → Bank and Expense → Bank** to reconcile.
- [ ] **27.** Ravi **pays a dividend** to the shareholders of whatever is left.
- [ ] **28.** Add a **memo** on one eligible external withdrawal.
- [ ] **29.** On the **Classification** page (owner): classify Ravi's Bank withdrawal (step 15) as an **Expense** and confirm the income
      statement and balance sheet update after a **refresh**. A direct deposit remains `Service Revenue` even when legacy classification
      data exists. Confirm a company-pocket move (for example, Bank → Payroll, step 16) remains internal, and that a **non-owner** sees the
      classifications read-only.
- [ ] **30.** Open the **ledger**: search rows, filter by each category, toggle column visibility, paginate.
- [ ] **31.** Open a **line drill-down** (loupe / Details) on an account.
- [ ] **32.** **Export** the ledger / a statement.
- [ ] **33.** Refresh and re-open the page on an **empty team**, and with a **failed / NFT** transfer present.
- [ ] **34.** **Create a vesting schedule** of **10 SHER** for Hermann (short duration, no cliff) — confirm the books show the **whole 10
      SHER promised** the same day, with **no profit impact** and **no change in total equity**.
- [ ] **35.** Hermann **releases** part of the schedule once some of it has vested — confirm the released shares move from **promised** to
      **issued**, that the issued amount matches the SHER he actually received, and that the release is booked **once**.
- [ ] **36.** **Stop** the schedule before it fully vests — confirm the vested part stays issued and the **unvested remainder is
      cancelled**, leaving no promised shares for that schedule.
- [ ] **37.** Create a second schedule and **stop it before anything vests** — confirm the whole award is cancelled and nothing was issued.
