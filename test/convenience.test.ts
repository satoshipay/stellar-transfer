import test from "ava"
import { Asset, Server } from "stellar-sdk"
import { fetchAssetTransferInfos, fetchTransferServers } from "../src/index"

test("fetchAssetTransferInfos() works", async t => {
  const eurt = new Asset(
    "EURT",
    "GAP5LETOV6YIE62YAM56STDANPRDO7ZFDBGSNHJQIYGGKSMOZAHOOS2S"
  )
  const shit = new Asset(
    "SHIT",
    "GDOOMATUOJPLIQMQ4WWXBEWR5UMKJW65CFKJJW3LV7XZYIEQHZPDQCBI"
  )

  const horizon = new Server("https://horizon.stellar.org/")
  const transferServers = await fetchTransferServers(horizon, [eurt, shit])
  const transferInfos = await fetchAssetTransferInfos(transferServers)

  t.true(transferInfos.has(eurt))
  t.true(transferInfos.has(shit))
  t.is(Array.from(transferInfos.keys()).length, 2)

  const eurtInfo = transferInfos.get(eurt)
  if (!eurtInfo) {
    return t.fail(`EURT info not found.`)
  }
  if (!eurtInfo.transferInfo) {
    return t.fail(`EURT transferInfo property not found.`)
  }

  t.is(eurtInfo.deposit && eurtInfo.deposit.enabled, true)
  t.is(typeof eurtInfo.transferInfo.deposit, "object")
  t.is(typeof eurtInfo.transferInfo.withdraw, "object")
  t.is(eurtInfo.withdraw && eurtInfo.withdraw.enabled, true)
  t.is(eurtInfo.withdraw && typeof eurtInfo.withdraw.types, "object")

  t.deepEqual(transferInfos.get(shit), {
    deposit: undefined,
    transferInfo: undefined,
    withdraw: undefined
  })
})
