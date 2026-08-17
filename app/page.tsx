"use client"

import { useState, useMemo } from "react"

type BrokerKey = "icici" | "kotak" | "zerodha" | "groww"

const BROKER_CONFIGS: Record<
  BrokerKey,
  { name: string; calcBrokerage: (gross: number) => number; dpCharge: number }
> = {
  icici: {
    name: "ICICI Direct",
    calcBrokerage: (gross) => Math.round(gross * 0.0029 * 100) / 100,
    dpCharge: 23.6, // ₹20 + 18% GST
  },
  kotak: {
    name: "Kotak Neo",
    // Trade Free Plan: 0.20% delivery brokerage (₹0 only for first 30 days)
    calcBrokerage: (gross) => Math.round(gross * 0.002 * 100) / 100,
    dpCharge: 15.93, // ₹13.50 + 18% GST
  },
  zerodha: {
    name: "Zerodha Kite",
    calcBrokerage: () => 0.0, // ₹0 Equity Delivery
    dpCharge: 15.34, // ₹3.5 CDSL + ₹9.5 Zerodha + ₹2.34 GST (18% on ₹13)
  },
  groww: {
    name: "Groww",
    // ₹20 or 0.1% per executed order, whichever is lower, min ₹5
    calcBrokerage: (gross) => Math.round(Math.min(20, Math.max(5, gross * 0.001)) * 100) / 100,
    dpCharge: 22.97, // ₹3.5 CDSL + ₹16.5 Groww + 18% GST on ₹16.5
  },
}

function fmt(num: number) {
  return (
    "₹" +
    Number(num).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

function computeForBroker(key: BrokerKey, qty: number, buyPrice: number, sellPrice: number) {
  const costAcq = qty * buyPrice
  const grossSale = qty * sellPrice
  const cfg = BROKER_CONFIGS[key]

  const brokerage = cfg.calcBrokerage(grossSale)
  const stt = Math.round(grossSale * 0.001 * 100) / 100
  const nseTurnover = Math.round(grossSale * 0.0000307 * 100) / 100
  const sebi = Math.round(grossSale * 0.000001 * 100) / 100
  const gst = Math.round((brokerage + nseTurnover + sebi) * 0.18 * 100) / 100
  const dpFee = grossSale > 0 ? cfg.dpCharge : 0.0

  const totalOrderCharges = brokerage + stt + nseTurnover + sebi + gst
  const totalDeductions = totalOrderCharges + dpFee
  const netBankCredit = grossSale > 0 ? grossSale - totalDeductions : 0

  // Deductible expenses exclude STT
  const deductibleExpenses = brokerage + nseTurnover + sebi + gst + dpFee
  const netSaleValue = grossSale - deductibleExpenses
  const rawStcg = grossSale > 0 ? Math.max(0, netSaleValue - costAcq) : 0

  const stcgTaxBase = Math.round(rawStcg * 0.2 * 100) / 100
  const cess = Math.round(stcgTaxBase * 0.04 * 100) / 100
  const totalStcgTax = stcgTaxBase + cess

  const netRetained = grossSale > 0 ? netBankCredit - totalStcgTax : 0
  const netProfit = grossSale > 0 ? netRetained - costAcq : 0

  return {
    name: cfg.name,
    grossSale,
    costAcq,
    brokerage,
    stt,
    otherCharges: nseTurnover + sebi + gst,
    totalOrderCharges,
    dpFee,
    netBankCredit,
    rawStcg,
    totalStcgTax,
    netRetained,
    netProfit,
  }
}

export default function Page() {
  const [broker, setBroker] = useState<BrokerKey>("icici")
  const [qty, setQty] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [sellPrice, setSellPrice] = useState("")

  const nQty = Number.parseFloat(qty) || 0
  const nBuy = Number.parseFloat(buyPrice) || 0
  const nSell = Number.parseFloat(sellPrice) || 0

  const current = useMemo(() => computeForBroker(broker, nQty, nBuy, nSell), [broker, nQty, nBuy, nSell])

  const summaryStr = `Net Retained Amount = Gross Sale (${fmt(current.grossSale)}) - ${current.name} Charges (${fmt(
    current.totalOrderCharges,
  )}) - DP Debit Fee (${fmt(current.dpFee)}) - STCG Tax (${fmt(current.totalStcgTax)}) = ${fmt(
    current.netRetained,
  )} | Net Profit: ${fmt(current.netProfit)}`

  const comparison = (["icici", "kotak", "zerodha", "groww"] as BrokerKey[]).map((key) => {
    const res = computeForBroker(key, nQty, nBuy, nSell)
    return { ...res, totalAllCharges: res.totalOrderCharges + res.dpFee }
  })

  function copySummary() {
    navigator.clipboard.writeText(summaryStr)
    alert("Summary copied to clipboard!")
  }

  return (
    <>
      <style>{`
        :root {
          --bg: #0b0f19;
          --card-bg: #161f30;
          --border: #2d3748;
          --accent: #3b82f6;
          --text: #f8fafc;
          --text-muted: #94a3b8;
          --green: #22c55e;
          --red: #ef4444;
        }
        .calc * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .calc-body { background-color: var(--bg); color: var(--text); padding: 24px 16px; min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; }
        .container { width: 100%; max-width: 620px; background: var(--card-bg); border-radius: 16px; border: 1px solid var(--border); padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .calc h1 { font-size: 1.3rem; font-weight: 700; color: #fff; margin-bottom: 4px; }
        .calc p.sub { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 20px; }
        .input-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; }
        .input-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .calc label { font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.5px; }
        .calc input, .calc select { background: #0b0f19; border: 1px solid var(--border); color: #fff; padding: 10px 12px; border-radius: 8px; font-size: 0.95rem; outline: none; transition: border-color 0.2s; width: 100%; }
        .calc input:focus, .calc select:focus { border-color: var(--accent); }
        .result-card { background: #0b0f19; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid var(--border); }
        .hero-stat { text-align: center; padding-bottom: 14px; border-bottom: 1px dashed var(--border); }
        .hero-stat .label { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }
        .hero-stat .val { font-size: 1.8rem; font-weight: 800; }
        .val.positive { color: var(--green); }
        .val.negative { color: var(--red); }
        .breakdown-table { width: 100%; margin-top: 14px; border-collapse: collapse; font-size: 0.85rem; }
        .breakdown-table td { padding: 6px 0; color: var(--text-muted); }
        .breakdown-table td:last-child { text-align: right; color: var(--text); font-weight: 600; }
        .breakdown-table tr.total td { border-top: 1px solid var(--border); padding-top: 8px; color: var(--text); font-weight: 700; }
        .summary-box { background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 12px; font-size: 0.8rem; color: var(--text-muted); font-family: monospace; word-break: break-all; margin-top: 14px; }
        .copy-btn { margin-top: 8px; width: 100%; background: var(--border); color: var(--text); border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: background 0.2s; }
        .copy-btn:hover { background: #475569; }
        .compare-section { margin-top: 20px; border-top: 1px solid var(--border); padding-top: 16px; }
        .compare-section h2 { font-size: 0.95rem; margin-bottom: 12px; color: #fff; }
        .compare-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: left; }
        .compare-table th { color: var(--text-muted); padding: 6px 8px; border-bottom: 1px solid var(--border); }
        .compare-table td { padding: 8px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); }
      `}</style>

      <div className="calc">
        <div className="calc-body">
          <div className="container">
            <h1>Equity Delivery P&amp;L Calculator</h1>
            <p className="sub">Computes Brokerage, Statutory Charges, DP Fees &amp; STCG (20% + 4% Cess)</p>

            <div className="input-grid">
              <div className="input-group" style={{ gridColumn: "span 2" }}>
                <label htmlFor="brokerSelect">Selected Broker</label>
                <select
                  id="brokerSelect"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value as BrokerKey)}
                >
                  <option value="icici">ICICI Direct (MoneySaver Plan - 0.29% Delivery)</option>
                  <option value="kotak">Kotak Neo (Trade Free Plan - 0.20% Delivery)</option>
                  <option value="zerodha">Zerodha Kite (₹0 Delivery)</option>
                  <option value="groww">Groww (₹20 or 0.1%, whichever lower)</option>
                </select>
              </div>
            </div>

            <div className="input-grid-3">
              <div className="input-group">
                <label htmlFor="qty">Shares (Qty)</label>
                <input id="qty" type="number" min="1" step="1" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div className="input-group">
                <label htmlFor="buyPrice">Buy Price (₹)</label>
                <input
                  id="buyPrice"
                  type="number"
                  min="0"
                  step="0.05"
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="sellPrice">Sell Price (₹)</label>
                <input
                  id="sellPrice"
                  type="number"
                  min="0"
                  step="0.05"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="result-card">
              <div className="hero-stat">
                <div className="label">Net In-Hand Profit (Post-Tax)</div>
                <div className={"val " + (current.netProfit >= 0 ? "positive" : "negative")}>{fmt(current.netProfit)}</div>
              </div>

              <table className="breakdown-table">
                <tbody>
                  <tr>
                    <td>Gross Sale Value</td>
                    <td>{fmt(current.grossSale)}</td>
                  </tr>
                  <tr>
                    <td>Cost of Acquisition</td>
                    <td>{fmt(current.costAcq)}</td>
                  </tr>
                  <tr>
                    <td>Brokerage</td>
                    <td>{fmt(current.brokerage)}</td>
                  </tr>
                  <tr>
                    <td>STT (0.1% on Sell)</td>
                    <td>{fmt(current.stt)}</td>
                  </tr>
                  <tr>
                    <td>Exchange/SEBI/GST Charges</td>
                    <td>{fmt(current.otherCharges)}</td>
                  </tr>
                  <tr>
                    <td>DP Debit Fee (+ 18% GST)</td>
                    <td>{fmt(current.dpFee)}</td>
                  </tr>
                  <tr className="total">
                    <td>Cash Credited to Bank</td>
                    <td>{fmt(current.netBankCredit)}</td>
                  </tr>
                  <tr>
                    <td>Taxable STCG</td>
                    <td>{fmt(current.rawStcg)}</td>
                  </tr>
                  <tr>
                    <td>STCG Tax (20% + 4% Cess)</td>
                    <td>{fmt(current.totalStcgTax)}</td>
                  </tr>
                  <tr className="total">
                    <td>Total Net Retained Amount</td>
                    <td>{fmt(current.netRetained)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="summary-box">{summaryStr}</div>
            <button className="copy-btn" onClick={copySummary}>
              Copy Summary Line
            </button>

            <div className="compare-section">
              <h2>Side-by-Side Broker Comparison</h2>
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Broker</th>
                    <th>Total Charges</th>
                    <th>STCG Tax</th>
                    <th>Net Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((res) => (
                    <tr key={res.name}>
                      <td style={{ fontWeight: 600, color: "#fff" }}>{res.name}</td>
                      <td>{fmt(res.totalAllCharges)}</td>
                      <td>{fmt(res.totalStcgTax)}</td>
                      <td
                        style={{
                          color: res.netProfit >= 0 ? "var(--green)" : "var(--red)",
                          fontWeight: 700,
                        }}
                      >
                        {fmt(res.netProfit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <span>Made with ❤️ for IPOs</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
