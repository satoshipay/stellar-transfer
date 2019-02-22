import test from "ava"
import { Server } from "stellar-sdk"
import { fetchTransferServerURL } from "../src/index"

test("fetchTransferServerURL() can fetch the TEMPO transfer server", async t => {
  const horizon = new Server("https://horizon.stellar.org/")
  const transferServerURL = await fetchTransferServerURL(
    horizon,
    "GAP5LETOV6YIE62YAM56STDANPRDO7ZFDBGSNHJQIYGGKSMOZAHOOS2S"
  )

  t.is(transferServerURL, "https://api.tempo.eu.com/t1")
})
