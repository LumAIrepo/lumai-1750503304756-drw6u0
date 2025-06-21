```tsx
'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

interface BondingCurveChartProps {
  currentSupply: number
  maxSupply?: number
  currentPrice: number
  className?: string
}

interface ChartDataPoint {
  supply: number
  price: number
  priceFormatted: string
}

const BondingCurveChart: React.FC<BondingCurveChartProps> = ({
  currentSupply,
  maxSupply = 1000000,
  currentPrice,
  className = ''
}) => {
  const chartData = useMemo(() => {
    const data: ChartDataPoint[] = []
    const steps = 100
    const stepSize = maxSupply / steps

    for (let i = 0; i <= steps; i++) {
      const supply = i * stepSize
      // Bonding curve formula: price = (supply / 16000)^2
      const price = Math.pow(supply / 16000, 2)
      
      data.push({
        supply,
        price,
        priceFormatted: `${price.toFixed(6)} SOL`
      })
    }

    return data
  }, [maxSupply])

  const currentDataPoint = useMemo(() => {
    return {
      supply: currentSupply,
      price: currentPrice,
      priceFormatted: `${currentPrice.toFixed(6)} SOL`
    }
  }, [currentSupply, currentPrice])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm">{`Supply: ${Number(label).toLocaleString()}`}</p>
          <p className="text-blue-400 font-medium">{`Price: ${payload[0].value.toFixed(6)} SOL`}</p>
        </div>
      )
    }
    return null
  }

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (Math.abs(payload.supply - currentSupply) < maxSupply * 0.02) {
      return (
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill="#3b82f6"
          stroke="#1e40af"
          strokeWidth={2}
          className="animate-pulse"
        />
      )
    }
    return null
  }

  return (
    <Card className={`bg-gray-900 border-gray-800 ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-white text-lg font-semibold flex items-center justify-between">
          Bonding Curve
          <div className="text-sm font-normal text-gray-400">
            Current: {currentPrice.toFixed(6)} SOL
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="supply"
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(value) => `${value.toFixed(4)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 4, fill: "#3b82f6" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 mb-1">Current Supply</div>
            <div className="text-white font-medium">{currentSupply.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 mb-1">Max Supply</div>
            <div className="text-white font-medium">{maxSupply.toLocaleString()}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-gray-400 mb-1">Progress</div>
            <div className="text-white font-medium">{((currentSupply / maxSupply) * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>0</span>
            <span>{maxSupply.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentSupply / maxSupply) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <p>Price increases quadratically with supply following the bonding curve formula.</p>
          <p className="mt-1">Early buyers benefit from lower prices as supply grows.</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default BondingCurveChart
```