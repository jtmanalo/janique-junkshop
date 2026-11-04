import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL
const REFRESH_INTERVAL_MS = 60_000

type PriceRow = {
  Item?: string
  Price?: string | number
}

type PriceListResponse = {
  updatedAt?: string
  prices: PriceRow[]
}

export default function PriceList() {
  const [prices, setPrices] = useState<PriceRow[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(API_URL))
  const [error, setError] = useState<string | null>(
    API_URL ? null : 'The price list API URL is not configured.',
  )

  useEffect(() => {
    if (!API_URL) {
      return
    }

    const loadPrices = async () => {
      try {
        const separator = API_URL.includes('?') ? '&' : '?'
        const response = await fetch(
          `${API_URL}${separator}_=${Date.now()}`,
          { cache: 'no-store' },
        )

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const data = (await response.json()) as
          | PriceListResponse
          | PriceRow[]

        if (Array.isArray(data)) {
          setPrices(data)
        } else {
          if (!Array.isArray(data.prices)) {
            throw new Error('The API response does not contain a prices array.')
          }

          setPrices(data.prices)
          setUpdatedAt(data.updatedAt ?? null)
        }

        setError(null)
      } catch (error: unknown) {
        console.error('Error fetching prices:', error)
        setError(
          error instanceof Error
            ? `Unable to load the latest prices: ${error.message}`
            : 'Unable to load the latest prices.',
        )
      } finally {
        setLoading(false)
      }
    }

    void loadPrices()
    const refreshTimer = window.setInterval(loadPrices, REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(refreshTimer)
    }
  }, [])

  return (
    <main className="price-list">
      <header className="price-list__header">
        <p className="eyebrow">JANIQUE JUNKSHOP</p>
        <h1>Janique Price List</h1>
        <p className="subtitle">
          {updatedAt
            ? ` as of ${new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(updatedAt))}`
            : '.'}
        </p>
      </header>

      {loading ? (
        <p className="status-message">Loading latest prices...</p>
      ) : error ? (
        <p className="status-message">{error}</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              {prices.length > 0 ? (
                prices.map((row, index) => (
                  <tr key={`${row.Item ?? 'item'}-${index}`}>
                    <td>{row.Item}</td>
                    <td>{row.Price}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="empty-state" colSpan={2}>
                    No prices available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
