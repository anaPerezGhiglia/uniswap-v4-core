# Uniswap v4-core — Hardhat 3 Migration Report

**Hardhat version installed:** `^3.1.10`
**Migration date:** 2026-03-03
**Foundry analysis:** [Foundry analysis](v4-core-foundry-migration-analysis.md)

---

**Verdict:** 🟡 **Successful with gaps**

### Blockers

None. All 598 active tests pass.

### Notable gaps (non-blocking, medium+ impact)

- 🚩 No equivalent for `forge snapshot` — gas snapshot workflow unavailable ([#7769](https://github.com/NomicFoundation/hardhat/issues/7769))
- 🟡 Inline `forge-config:` per-test overrides silently ignored — fuzz runs in `test/ModifyLiquidity.t.sol` always use the global value ([#7355](https://github.com/NomicFoundation/hardhat/issues/7355))
- 🟡 Per-profile fuzz overrides (`[profile.pr.fuzz]`, `[profile.ci.fuzz]`) — CI/PR workflows can't vary fuzz runs via build profiles

---

## 1. Test Count Comparison

| Metric | Count |
|---|---|
| `function test*` declarations in `.t.sol` files | 600 |
| Already commented out in source | 2 (`testExtsloadForPoolPrice`, `testExtsloadMultipleSlots` in `test/PoolManager.t.sol`) |
| Active test functions | 598 |
| Hardhat tests passing | 598 |
| **Discrepancy** | **0** |

## 2. Feature Parity

### Gaps, bugs & partial support

| Feature | Parity | Impact | Workaround / Notes |
|---|---|---|---|
| Gas snapshots (`forge snapshot`) | 🚩 **Gap** | **Medium** — `.forge-snapshots/` referenced in config but no snapshot generation available | [#7769](https://github.com/NomicFoundation/hardhat/issues/7769) — no workaround currently |
| Inline test config (`forge-config:`) | 🟡 **Partial** | **Medium** — `test/ModifyLiquidity.t.sol` has per-test fuzz run overrides that are silently ignored; always uses global `fuzz.runs = 1000` | [#7355](https://github.com/NomicFoundation/hardhat/issues/7355) — no workaround; tests still run but with different fuzz intensity |
| Per-profile fuzz overrides (`[profile.pr.fuzz]`, `[profile.ci.fuzz]`) | 🟡 **Partial** | **Medium** — CI/PR workflows can't vary fuzz runs via build profiles; Hardhat profiles only cover compiler settings | Use env vars or CLI args to vary `fuzz.runs` per environment |
| Debug build profile test settings (`[profile.debug] fuzz.runs`) | 🟡 **Partial** | **Low** — debug profile compiler settings (viaIR, optimizer) are migrated, but `fuzz.runs = 100` override cannot be included in the build profile | Hardhat build profiles only support compiler settings; use CLI args for test settings |

### Full parity

These features work equivalently in Hardhat 3:

- Solidity compilation (`forge build` -> `npx hardhat compile`) — all 84 source + 48 test files compiled
- forge-std cheatcodes (`vm.*`) — all cheatcodes used by this project work correctly
- Fuzz testing — 1000 runs with seed `0x4444`, matching `[profile.default.fuzz]`
- FFI (`vm.ffi`) — enabled and working (used by `JavascriptFfi` helper)
- File system permissions (`vm.readFileBinary`, etc.) — working with correct directory-level access
- `allowInternalExpectRevert` — mapped and working
- `viaIR` compilation — enabled with 44,444,444 optimizer runs
- EVM version `cancun` — transient storage opcodes work correctly
- `bytecodeHash = "none"` — metadata stripping configured
- Gas limit (300M) — configured as bigint
- Build profiles — `default` and `debug` profiles migrated with compiler settings
- Remappings — `remappings.txt` loaded natively (forge-std, solmate, openzeppelin)

**Features not used by this project:**
- Deployment scripts (`forge script` / `.s.sol`) — project has no `script/` directory
- Etherscan verification (`forge verify-contract`) — no `[etherscan]` section in `foundry.toml`
- Invariant testing (`invariant_*` functions) — no invariant tests present
- `forge bind` / bindings generation — not used

## 3. Workarounds Applied

1. **Absolute imports -> relative imports** — 5 test files had `src/` or `test/` absolute imports that Hardhat 3 doesn't support. Converted to relative paths:
   - `test/ModifyLiquidity.t.sol` — 8 imports
   - `test/utils/NestedActions.t.sol` — 3 imports
   - `test/libraries/Hooks.t.sol` — 1 import
   - `test/libraries/LiquidityMath.t.sol` — 2 imports
   - `test/libraries/TickMath.t.sol` — 3 imports

2. **`fsPermissions` mapping correction** — `./test/bin` in `foundry.toml` is a directory, requiring `readDirectory` (prefix matching) in Hardhat, not `readFile` (exact path match). Initial config used `readFile`, causing `V3SwapTests#setUp()` to fail on `vm.readFileBinary("test/bin/v3Factory.bytecode")`.

3. **ESM mode** — Added `"type": "module"` to `package.json` (required by Hardhat 3). No existing CommonJS files were affected.

## 4. Next Steps

1. **Set up CI fuzz run variation** — The `[profile.pr.fuzz]` (10K runs) and `[profile.ci.fuzz]` (100K runs) profiles only override test settings, which Hardhat build profiles don't support. Configure CI workflows to pass different fuzz run counts via environment variables or CLI arguments.

2. **Evaluate gas snapshot replacement** — The project references `.forge-snapshots/` in `fs_permissions` but the directory doesn't exist yet. If gas benchmarking is needed, track [#7769](https://github.com/NomicFoundation/hardhat/issues/7769) or implement a custom solution using Hardhat's gas reporting.

3. **Monitor inline test config support** — `test/ModifyLiquidity.t.sol` uses `/// forge-config:` to override fuzz runs per-test. Track [#7355](https://github.com/NomicFoundation/hardhat/issues/7355) for native support.
