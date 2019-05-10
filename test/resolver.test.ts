import test from "ava"
import { fetchTransferServerURL } from "../src/index"

test("fetchTransferServerURL() can fetch the TEMPO transfer server", async t => {
  const transferServerURL = await fetchTransferServerURL(
    "https://horizon.stellar.org/",
    "GAP5LETOV6YIE62YAM56STDANPRDO7ZFDBGSNHJQIYGGKSMOZAHOOS2S"
  )

  t.is(transferServerURL, "https://api.tempo.eu.com/t1")
})
