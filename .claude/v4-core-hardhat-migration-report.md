# Uniswap v4-core — Hardhat 3 Migration Report

**Hardhat version installed:** `^3.3.0`
**Migration date:** 2026-04-06
**Foundry analysis:** [Foundry analysis](v4-core-foundry-migration-analysis.md)

---

**Verdict:** 🟡 **Successful with gaps**

### Blockers

None. All 598 active tests pass.

### Notable gaps (non-blocking, medium+ impact)

- 🟡 Inline test config partially supported — non-default profile references (`pr`, `ci`, `debug`) cause errors and must be commented out; `isolate` and `evm_version` not yet available inline ([edr#1349](https://github.com/NomicFoundation/edr/issues/1349))
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
| `Inline test config` | 🟡 **Partial** | **Medium** — `test/ModifyLiquidity.t.sol` has per-test fuzz overrides; `default` profile works since HH 3.3.0 but non-default profiles (`pr`, `ci`, `debug`) cause HHE810 errors | Non-default `///` directives changed to `//` comments to prevent parsing; `default.fuzz.runs = 10` now works correctly |
| `Fuzz/invariant profile overrides` | 🟡 **Partial** | **Medium** — CI/PR workflows can't vary fuzz runs via build profiles; `[profile.pr.fuzz]` (10K runs) and `[profile.ci.fuzz]` (100K runs) have no equivalent | Use env vars or CLI args to vary `fuzz.runs` per environment |
| Debug build profile test settings | 🟡 **Partial** | **Low** — debug profile compiler settings (viaIR, optimizer) are migrated, but `fuzz.runs = 100` override cannot be included in the build profile | Hardhat build profiles only support compiler settings; use CLI args for test settings |

### Full parity

These features work equivalently in Hardhat 3:

- Solidity compilation (`forge build` → `npx hardhat compile`) — all 84 source + 48 test files compiled
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
- Gas snapshots — `npx hardhat test solidity --snapshot` and `--snapshot-check` both work (new in HH 3.3.0)

**Features not used by this project:**
- Deployment scripting (`forge script` / `.s.sol`) — project has no `script/` directory
- Etherscan verification (`forge verify-contract`) — no `[etherscan]` section in `foundry.toml`
- Invariant testing (`invariant_*` functions) — no invariant tests present
- ABI binding generation (`forge bind`) — not used

## 3. Workarounds Applied

1. **Absolute imports → relative imports** — 5 test files had `src/` or `test/` absolute imports that Hardhat 3 doesn't support. Converted to relative paths:
   - `test/ModifyLiquidity.t.sol` — 8 imports
   - `test/utils/NestedActions.t.sol` — 3 imports
   - `test/libraries/Hooks.t.sol` — 1 import
   - `test/libraries/LiquidityMath.t.sol` — 2 imports
   - `test/libraries/TickMath.t.sol` — 3 imports

   **Root cause:** Forge resolves `src/Foo.sol` as relative to the project root via `libs` and remappings. Hardhat 3 uses Node.js module resolution which treats bare `src/` as a package name, not a project-relative path.

2. **`fsPermissions` mapping correction** — `./test/bin` in `foundry.toml` is a directory, requiring `readDirectory` (prefix matching) in Hardhat, not `readFile` (exact path match). Initial config used `readFile`, causing `V3SwapTests#setUp()` to fail on `vm.readFileBinary("test/bin/v3Factory.bytecode")`.

3. **ESM mode** — Added `"type": "module"` to `package.json` (required by Hardhat 3). No existing CommonJS files were affected.

4. **Snapshot name sanitization** — Hardhat 3.3.0's `vm.snapshotValue` and `vm.snapshotGasLastCall` reject names containing parentheses, `+`, and other punctuation that Forge accepts. Two snapshot names were renamed:
   - `test/PoolManager.t.sol:test_initcodeHash` — `"poolManager initcode hash (without constructor params, as uint256)"` → `"poolManager initcode hash - without constructor params as uint256"`
   - `test/CustomAccounting.t.sol:test_swap_beforeSwapNoOpsSwap_exactInput` — `"swap CA custom curve + swap noop"` → `"swap CA custom curve - swap noop"`

5. **Non-default inline config profiles commented out** — Hardhat 3.3.0 errors (HHE810) on `/// forge-config: <non-default-profile>` directives. Changed `///` to `//` for the `pr`, `ci`, and `debug` profile lines in `test/ModifyLiquidity.t.sol` to prevent Hardhat from parsing them.

## 4. Next Steps

1. **Set up CI fuzz run variation** — The `[profile.pr.fuzz]` (10K runs) and `[profile.ci.fuzz]` (100K runs) profiles only override test settings, which Hardhat build profiles don't support. Configure CI workflows to pass different fuzz run counts via environment variables or CLI arguments.

2. **Monitor inline config improvements** — Non-default profile support and remaining unsupported inline settings (`isolate`, `evm_version`) are tracked at [edr#1349](https://github.com/NomicFoundation/edr/issues/1349). When support is added, the `//` comment workaround in `test/ModifyLiquidity.t.sol` can be reverted to `///`.

3. **Monitor snapshot name validation** — Hardhat's snapshot name validation is stricter than Forge's. If this is relaxed in a future release, the two renamed snapshots can be restored to their original names to maintain consistency with Forge snapshot files.
