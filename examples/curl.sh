#!/usr/bin/env bash
# Working calls to Sippar's five models on AntSeed. Each one is a paid purchase from YOUR
# AntSeed buyer proxy (default 127.0.0.1:8377), billed per output token at the rate on the
# peer record. Run one at a time; read the routing line on a chain-state answer before you
# use it. Transport rules: the sippar-antseed-buyer skill.
set -euo pipefail
PROXY="${SIPPAR_ANTSEED_PROXY:-http://127.0.0.1:8377}"
PEER='706fca9c0d0684c30f86209aae0c3565ce1aa69f'

call() {
  curl -s "$PROXY/v1/chat/completions" \
    -H 'content-type: application/json' \
    -H "x-antseed-pin-peer: $PEER" \
    -d "$1"
}

case "${1:-}" in
  chain)   # two fields on Base
    call '{"model":"quicknode-blockchain-data","network":"base","fields":["blockNumber","gasPrice"],
           "messages":[{"role":"user","content":"chain state"}]}' ;;
  account) # one account on Arbitrum, only its own rows; pass the address as $2
    call "{\"model\":\"quicknode-blockchain-data\",\"network\":\"arbitrum\",\"address\":\"$2\",
           \"fields\":[\"addressNativeBalance\",\"addressErc20Balance\",\"addressTransactionCount\"],
           \"messages\":[{\"role\":\"user\",\"content\":\"chain state\"}]}" ;;
  logs)    # USDC transfers on Ethereum over a 16-block range; narrow ranges keep the page small
    call '{"model":"quicknode-blockchain-data","network":"ethereum",
           "rpc":{"method":"eth_getLogs","params":[{"address":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
             "topics":["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"],
             "fromBlock":"0x15f9000","toBlock":"0x15f9010"}]},
           "messages":[{"role":"user","content":"chain state"}]}' ;;
  wallet)  # every ERC-20 transfer a wallet received in a 16-block range; pass the 0x address as $2
    w=$(echo "${2:?usage: $0 wallet 0x<40 hex>}" | sed 's/^0x//' | tr 'A-F' 'a-f')
    call "{\"model\":\"quicknode-blockchain-data\",\"network\":\"ethereum\",
           \"rpc\":{\"method\":\"eth_getLogs\",\"params\":[{\"topics\":[\"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef\",null,\"0x000000000000000000000000$w\"],
             \"fromBlock\":\"0x15f9000\",\"toBlock\":\"0x15f9010\"}]},
           \"messages\":[{\"role\":\"user\",\"content\":\"chain state\"}]}" ;;
  block)   # the latest Base block: header and transaction hashes
    call '{"model":"quicknode-blockchain-data","network":"base","rpc":{"method":"eth_getBlockByNumber","params":["latest",false]},
           "messages":[{"role":"user","content":"chain state"}]}' ;;
  tokens)  # ten rows by volume on Base and Solana over a week
    call '{"model":"nansen-crypto-screener","chains":["base","solana"],"timeframe":"7d","sort":"volume","rows":10,
           "messages":[{"role":"user","content":"top tokens"}]}' ;;
  perps)   # Nansen's perpetuals screener; "view" goes alone
    call '{"model":"nansen-crypto-screener","view":"perp-screener",
           "messages":[{"role":"user","content":"perps"}]}' ;;
  search)  # the last user message is the query; pass it as $2
    call "{\"model\":\"tavily-web-search\",\"messages\":[{\"role\":\"user\",\"content\":\"$2\"}]}" ;;
  skill)   # a CryptoSkill id (e.g. chains/aave), one of Sippar's skill names, or two or three keywords to search; pass it as $2
    call "{\"model\":\"crypto-skills\",\"messages\":[{\"role\":\"user\",\"content\":\"$2\"}]}" ;;
  x)       # X posts: keywords, names or X operators (from:, lang:, since:, "phrase"); any subject; pass the search as $2
    call "{\"model\":\"sippar-x-social\",\"messages\":[{\"role\":\"user\",\"content\":\"$2\"}]}" ;;
  translated) # a client that must post the Anthropic shape: arguments ride metadata.sippar and survive
    curl -s "$PROXY/v1/messages" -H 'content-type: application/json' -H "x-antseed-pin-peer: $PEER" \
      -d '{"model":"quicknode-blockchain-data","max_tokens":1024,
           "metadata":{"sippar":{"network":"base","fields":["blockNumber","gasPrice"]}},
           "messages":[{"role":"user","content":"chain state"}]}' ;;
  *) echo "usage: $0 chain | account 0x… | logs | wallet 0x… | block | tokens | perps | search 'question' | skill 'chains/aave' | x 'Formula 1 since:2026-10-01' | translated"; exit 2 ;;
esac
