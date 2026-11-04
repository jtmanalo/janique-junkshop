import { useEffect, useRef, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL
const REFRESH_INTERVAL_MS = 15_000

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
  const [hasPendingUpdate, setHasPendingUpdate] = useState(false)
  const [loading, setLoading] = useState(Boolean(API_URL))
  const [error, setError] = useState<string | null>(
    API_URL ? null : 'The price list API URL is not configured.',
  )
  const displayedUpdatedAt = useRef<string | null>(null)
  const pendingData = useRef<{
    prices: PriceRow[]
    updatedAt: string | null
  } | null>(null)

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

        const nextPrices = Array.isArray(data) ? data : data.prices
        const nextUpdatedAt = Array.isArray(data)
          ? null
          : data.updatedAt ?? null

        if (!Array.isArray(data) && !Array.isArray(data.prices)) {
          throw new Error('The API response does not contain a prices array.')
        }

        if (
          displayedUpdatedAt.current &&
          nextUpdatedAt &&
          displayedUpdatedAt.current !== nextUpdatedAt
        ) {
          pendingData.current = {
            prices: nextPrices,
            updatedAt: nextUpdatedAt,
          }
          setHasPendingUpdate(true)
        } else if (!displayedUpdatedAt.current || !nextUpdatedAt) {
          setPrices(nextPrices)
          setUpdatedAt(nextUpdatedAt)
          displayedUpdatedAt.current = nextUpdatedAt
        }

        if (!Array.isArray(data)) {
          setUpdatedAt((currentUpdatedAt) => currentUpdatedAt ?? nextUpdatedAt)
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

  const refreshPrices = () => {
    if (!pendingData.current) {
      return
    }

    setPrices(pendingData.current.prices)
    setUpdatedAt(pendingData.current.updatedAt)
    displayedUpdatedAt.current = pendingData.current.updatedAt
    pendingData.current = null
    setHasPendingUpdate(false)
  }

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
        {hasPendingUpdate && (
            <div className="update-notice" role="status">
              <span>New prices are available.</span>
              <button type="button" onClick={refreshPrices}>
                Refresh list
              </button>
            </div>
        )}
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
