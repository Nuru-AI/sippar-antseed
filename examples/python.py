"""Working calls to Sippar's five models on AntSeed with the OpenAI Python SDK.

Each call is a paid purchase from YOUR AntSeed buyer proxy, billed per output token at the
rate on the peer record. Use the chat-completions path only: the SDK's `responses` path is
translated by the proxy and your arguments are dropped. `extra_body` is flattened into the
request body by the SDK, which is exactly the top-level shape the models read.
Transport rules: the sippar-antseed-buyer skill.
"""
import os
from openai import OpenAI

PEER = "706fca9c0d0684c30f86209aae0c3565ce1aa69f"
client = OpenAI(base_url=os.environ.get("SIPPAR_ANTSEED_PROXY", "http://127.0.0.1:8377") + "/v1",
                api_key="not-used", default_headers={"x-antseed-pin-peer": PEER})


def chain_state(network: str, fields: list[str], **more) -> str:
    """Two fields on one chain; `more` may carry address, blocks, tokens or rpc."""
    r = client.chat.completions.create(
        model="quicknode-blockchain-data",
        messages=[{"role": "user", "content": "chain state"}],
        extra_body={"network": network, "fields": fields, **more},
    )
    return r.choices[0].message.content


def top_tokens(chains: list[str], timeframe: str = "24h", sort: str = "fdv", rows: int = 25) -> str:
    r = client.chat.completions.create(
        model="nansen-crypto-screener",
        messages=[{"role": "user", "content": "top tokens"}],
        extra_body={"chains": chains, "timeframe": timeframe, "sort": sort, "rows": rows},
    )
    return r.choices[0].message.content


def perp_screener() -> str:
    """`view` goes alone: none of the ranking arguments beside it."""
    r = client.chat.completions.create(
        model="nansen-crypto-screener",
        messages=[{"role": "user", "content": "perps"}],
        extra_body={"view": "perp-screener"},
    )
    return r.choices[0].message.content


def web_search(question: str) -> str:
    """The last user message is the query; the model takes no arguments."""
    r = client.chat.completions.create(
        model="tavily-web-search",
        messages=[{"role": "user", "content": question}],
    )
    return r.choices[0].message.content


def skill(request: str) -> str:
    """A CryptoSkill id ("chains/aave"), one of Sippar's skill names, or two or three keywords to search."""
    r = client.chat.completions.create(
        model="crypto-skills",
        messages=[{"role": "user", "content": request}],
    )
    return r.choices[0].message.content


def x_posts(search: str) -> str:
    """Public X posts: keywords, names or X operators (from:, lang:, since:, "phrase"), never a sentence."""
    r = client.chat.completions.create(
        model="sippar-x-social",
        messages=[{"role": "user", "content": search}],
    )
    return r.choices[0].message.content


if __name__ == "__main__":
    page = chain_state("base", ["blockNumber", "gasPrice"])
    # Read the routing line before using the page: mode=declared means your network arrived.
    print(page)
