import { defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: {
    profiles: {
      // === Default profile ===
      // Maps from [profile.default] in foundry.toml
      default: {
        compilers: [
          {
            version: "0.8.26",
            settings: {
              evmVersion: "cancun",
              optimizer: {
                enabled: true, // Forge default is true (Hardhat default is off)
                runs: 44_444_444,
              },
              viaIR: true,
              metadata: {
                bytecodeHash: "none",
              },
            },
          },
        ],
      },

      // === Debug profile ===
      // Maps from [profile.debug] — disables viaIR for faster compilation
      // TODO: [profile.debug] also sets fuzz.runs = 100, but Hardhat build profiles
      // don't support test settings. Use env vars or CLI args for that.
      debug: {
        compilers: [
          {
            version: "0.8.26",
            settings: {
              evmVersion: "cancun",
              optimizer: {
                enabled: true,
                runs: 200,
              },
              viaIR: false,
              metadata: {
                bytecodeHash: "none",
              },
            },
          },
        ],
      },
    },
  },

  paths: {
    sources: "./src", // Forge default is "src", Hardhat default is "./contracts"
    tests: "./test",
  },

  test: {
    solidity: {
      ffi: true,
      gasLimit: 300_000_000n,
      allowInternalExpectRevert: true,

      fsPermissions: {
        // .forge-snapshots/ — read-write directory access
        dangerouslyReadWriteDirectory: [".forge-snapshots/"],
        // ./out and ./test/bin — read directory access
        readDirectory: ["./out", "./test/bin"],
      },

      fuzz: {
        runs: 1000,
        seed: "0x4444",
      },

      // TODO: [profile.pr.fuzz] sets runs = 10000 — Hardhat profiles don't support
      // test settings. No equivalent for per-profile fuzz overrides.
      // TODO: [profile.ci.fuzz] sets runs = 100000 — same limitation.

      // Note: Inline forge-config in test/ModifyLiquidity.t.sol (fuzz.runs overrides
      // per-test) is supported at function level since Hardhat 3.3.0.
      // Non-default profile references (pr, ci, debug) cause HHE810 errors — they
      // were changed from `///` to `//` comments to prevent parsing.
    },
  },

  // === Foundry-only settings (no Hardhat equivalent) ===
  // TODO: out = "out" — Hardhat uses its own artifacts/ + cache/ dirs
  // TODO: libs = ["lib"] — Hardhat auto-resolves via remappings.txt
  // Gas snapshots: use `npx hardhat test solidity --snapshot` / `--snapshot-check`
});
