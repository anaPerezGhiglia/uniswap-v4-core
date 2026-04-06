# Uniswap v4-core — Foundry Migration Analysis

## foundry.toml Settings

### `[profile.default]`

| Setting | Value |
|---|---|
| `optimizer_runs` | `44444444` |
| `via_ir` | `true` |
| `ffi` | `true` |
| `fs_permissions` | `[{ access = "read-write", path = ".forge-snapshots/"}, { access = "read", path = "./out"}, {access = "read", path = "./test/bin"}]` |
| `solc` | `0.8.26` |
| `evm_version` | `cancun` |
| `gas_limit` | `300000000` |
| `bytecode_hash` | `none` |
| `allow_internal_expect_revert` | `true` |

**Note:** `optimizer` is not explicitly set — Forge defaults to `true`.

### `[profile.default.fuzz]`

| Setting | Value |
|---|---|
| `runs` | `1000` |
| `seed` | `"0x4444"` |

### `[profile.pr.fuzz]`

| Setting | Value |
|---|---|
| `runs` | `10000` |

### `[profile.ci.fuzz]`

| Setting | Value |
|---|---|
| `runs` | `100000` |

### `[profile.debug]`

| Setting | Value |
|---|---|
| `via_ir` | `false` |
| `optimizer_runs` | `200` |
| `fuzz.runs` | `100` |

**Note:** `[profile.pr]` and `[profile.ci]` only override fuzz settings (no compiler settings) — they have no Hardhat build profile equivalent. `[profile.debug]` overrides both compiler settings (`via_ir`, `optimizer_runs`) and test settings (`fuzz.runs`).

## Remappings (`remappings.txt`)

```
@ensdomains/=node_modules/@ensdomains/
@openzeppelin/=lib/openzeppelin-contracts/
ds-test/=lib/forge-std/lib/ds-test/src/
forge-std/=lib/forge-std/src/
hardhat/=node_modules/hardhat/
solmate/=lib/solmate/
```

## Git Submodules

| Submodule | Path |
|---|---|
| `forge-std` | `lib/forge-std` |
| `solmate` | `lib/solmate` |
| `openzeppelin-contracts` | `lib/openzeppelin-contracts` |

All submodules initialized and populated.

## Project Structure

- **Source directory:** `src/` (Forge default)
- **Test directory:** `test/` (39 `.t.sol` files, ~600 test functions)
- **Script directory:** none (`script/` does not exist)
- **`.forge-snapshots/`:** directory does not exist (referenced in `fs_permissions` but unused)

## Inline Test Config (`forge-config:` comments)

**1 file affected:**

- `test/ModifyLiquidity.t.sol` (lines 50-53): overrides fuzz runs for all 4 profiles (default=10, pr=10, ci=500, debug=10)

The `default` profile inline override is supported since Hardhat 3.3.0 at function level. Non-default profiles (`pr`, `ci`, `debug`) cause HHE810 errors — their `///` directives were changed to `//` to prevent parsing.

## Forge-dependent `package.json` Scripts

**None.** The `package.json` has no `scripts` section at all.

## Package Manager

**Selected:** `pnpm`
**Reason:** No lockfile exists (`yarn.lock`, `package-lock.json`, `pnpm-lock.yaml` all absent). Using `pnpm` as the default per migration instructions.

## Notable Patterns

- Project uses `via_ir = true` by default with very high optimizer runs (44,444,444)
- `gas_limit` is set to 300M (Forge default is ~1B)
- FFI is enabled (test files may use `vm.ffi()`)
- `allow_internal_expect_revert` is enabled
- `bytecode_hash = "none"` — strips metadata hash from bytecode
- The `debug` profile disables `via_ir` and uses standard optimizer runs — useful for faster local iteration
- The `fs_permissions` reference `.forge-snapshots/` (read-write), `./out` (read), and `./test/bin` (read)
- There's a `test/PoolManager.gas.spec.ts` file — a TypeScript test that won't be picked up by Solidity test runner
