# Manual check script for Step 12 (keyless on-chain lookups via public RPC).
# Run from the ml-service/ directory with the venv active:
#   python -m tests.test_step12_onchain

from app.chain_rpc import RPC_ENDPOINTS, fetch_onchain_basics

# Carries an EIP-7702 delegation, so it has code but is still a WALLET.
SMART_ACCOUNT = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
# A genuine token contract on BSC.
CAKE_ON_BSC = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82"


def test_balance_matches_the_chain():
    result = fetch_onchain_basics(CAKE_ON_BSC, "1")
    assert result is not None
    # This address holds a known ~14.12 ETH on Ethereum (verifiable on Etherscan).
    assert 14.0 < result["native_balance"] < 14.5, result["native_balance"]
    assert result["native_symbol"] == "ETH"
    print(f"[PASS] native balance read from a public node: {result['native_balance']} ETH")


def test_native_symbol_follows_the_chain():
    assert fetch_onchain_basics(CAKE_ON_BSC, "56")["native_symbol"] == "BNB"
    print("[PASS] the native symbol follows the chain (BNB on BSC, not ETH)")


def test_real_contract_is_detected():
    result = fetch_onchain_basics(CAKE_ON_BSC, "56")
    assert result["is_contract"] is True
    assert result["is_smart_account"] is False
    assert result["bytecode_size_bytes"] > 1000
    print(f"[PASS] a real contract is detected ({result['bytecode_size_bytes']} bytes of code)")


def test_eip7702_wallet_is_not_called_a_contract():
    # The subtle one: since EIP-7702 a wallet CAN have code (a 23-byte
    # delegation). Calling it a contract would misreport every modern
    # smart account, so this must come back as a wallet.
    result = fetch_onchain_basics(SMART_ACCOUNT, "1")
    assert result["is_contract"] is False, "an EIP-7702 wallet must not be called a contract"
    assert result["is_smart_account"] is True
    assert result["delegates_to"] and result["delegates_to"].startswith("0x")
    assert result["bytecode_size_bytes"] == 23
    print(f"[PASS] EIP-7702 wallet correctly identified, delegating to {result['delegates_to'][:12]}...")


def test_unsupported_chain_returns_none_instead_of_raising():
    assert fetch_onchain_basics(SMART_ACCOUNT, "999999") is None
    print("[PASS] an unsupported chain returns None rather than breaking the scan")


def test_all_configured_endpoints_respond():
    failures = [
        chain_id
        for chain_id in RPC_ENDPOINTS
        if fetch_onchain_basics(SMART_ACCOUNT, chain_id) is None
    ]
    assert not failures, f"no response from chains: {failures}"
    print(f"[PASS] all {len(RPC_ENDPOINTS)} configured RPC endpoints responded")


if __name__ == "__main__":
    test_balance_matches_the_chain()
    test_native_symbol_follows_the_chain()
    test_real_contract_is_detected()
    test_eip7702_wallet_is_not_called_a_contract()
    test_unsupported_chain_returns_none_instead_of_raising()
    test_all_configured_endpoints_respond()
    print("\nAll Step 12 checks completed.")
