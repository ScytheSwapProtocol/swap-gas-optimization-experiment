The idea behind this experiment was to allow parties to engage in two-step assets swaps with some gas optimization ideas.

This test implementation deals with an ERC20/ERC20 swap, but this could be easily extended to other pairings, like ERC20/ERC721, ERC721/ERC1155 and so forth; and then, naturally, to mixes like ERC20(A)+ERC1155->ERC721+ERC20(B).

In the trade modeled, Party A authorizes `Scythe` as the spender of its ERC20 tokens and then initiates the swap by sending the trade parameters:
- the address of A's ERC20 contract (`depositContract`)
- the amount to be exchanged (`depositAmount`)
- the address of B's ERC20 contract (`challengeContract`)
- the amount B is expected to exchange (`challengeAmount`)
- B's address (`counterparty`)

`Scythe` stores the trade information and returns a `dealId`.

Party B authorizes `Scythe` as the spender of its ERC20 tokens and challenges the trade by sending the `dealId`. If it matches `counterparty` for the `dealId`, `Scythe` performs an atomic swap.

Traditionally, because of lower gas prices, Solidity developers used to store setups for such trades
in arrays of structs. While understandably convenient, this isn't currently acceptable on L1.

`Scythe` instead packs all the parameters of a trade into a single `uint256`, thus reducing storage
costs. It does so by maintaining mappings from addresses to numeric handles, so only when `Scythe` sees an address for either a party or a contract for the first time, it costs excess gas to map them.

After this, if the addresses are already known, we're just reading the handles from storage and storing them in that single `uint256`.

In testing, the initial transaction cost 255k gas to the initiator, and then 87k gas to challenge.

The next 100 txs for two same parties averaged 67k gas to set up and 58k gas to challenge.

21k gas in each of these figures is the baseline tx fee. The challenger shoulders the cost of calling two `transfer`s on the ERC20 contracts, which is somewhat offset by the gas refund they get for deleting the "trade" record.