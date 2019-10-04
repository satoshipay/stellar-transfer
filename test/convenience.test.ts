import test from "ava"
import { Asset, Server } from "stellar-sdk"
import { fetchAssetTransferInfos, fetchTransferServers } from "../src/index"

test("fetchAssetTransferInfos() works", async t => {
  const usd = new Asset(
    "USD",
    "GDUKMGUGDZQK6YHYA5Z6AY2G4XDSZPSZ3SW5UN3ARVMO6QSRDWP5YLEX"
  )
  const shit = new Asset(
    "SHIT",
    "GDOOMATUOJPLIQMQ4WWXBEWR5UMKJW65CFKJJW3LV7XZYIEQHZPDQCBI"
  )

  const transferServers = await fetchTransferServers(
    new Server("https://horizon.stellar.org/"),
    [usd, shit]
  )
  const transferInfos = await fetchAssetTransferInfos(transferServers)

  t.true(transferInfos.has(usd))
  t.true(transferInfos.has(shit))
  t.is(Array.from(transferInfos.keys()).length, 2)

  const usdInfo = transferInfos.get(usd)
  if (!usdInfo) {
    return t.fail(`USD info not found.`)
  }
  if (!usdInfo.transferInfo) {
    return t.fail(`USD transferInfo property not found.`)
  }

  t.is(usdInfo.deposit && usdInfo.deposit.enabled, true)
  t.is(typeof usdInfo.transferInfo.deposit, "object")
  t.is(typeof usdInfo.transferInfo.withdraw, "object")
  t.is(usdInfo.withdraw && usdInfo.withdraw.enabled, true)
  t.is(usdInfo.withdraw && typeof usdInfo.withdraw.types, "object")

  t.deepEqual(transferInfos.get(shit), {
    deposit: undefined,
    transferInfo: undefined,
    withdraw: undefined
  })
})
