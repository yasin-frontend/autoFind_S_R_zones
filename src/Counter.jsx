// import { createChart } from "lightweight-charts";
// import { useEffect, useRef, useState } from "react";
// import axios from "axios";
// import "./App.css";

// const App = () => {
//   const chartRef = useRef(null);
//   const [symbols, setSymbols] = useState([]);
//   const [symbol, setSymbol] = useState("BTCUSDT");
//   const [timeframe, setTimeframe] = useState("1h");
//   const chartInstance = useRef(null);
//   const seriesRef = useRef(null);
  
//   const timeframes = ["1d", "4h", "1h"];

//   useEffect(() => {
//     const fetchSymbols = async () => {
//       try {
//         const response = await axios.get("https://api.binance.com/api/v3/exchangeInfo");
//         const usdtPairs = response.data.symbols
//           .filter((s) => s.symbol.endsWith("USDT") && s.status === "TRADING")
//           .map((s) => s.symbol);
//         setSymbols(usdtPairs);
//         setSymbol(usdtPairs[0] || "BTCUSDT");
//       } catch (error) {
//         console.error("Ошибка загрузки символов с Binance:", error);
//       }
//     };
//     fetchSymbols();
//   }, []);

//   useEffect(() => {
//     if (!symbol) return;
//     const fetchCandles = async () => {
//       try {
//         const response = await axios.get("https://api.binance.com/api/v3/klines", {
//           params: { symbol, interval: timeframe, limit: 1000 },
//         });

//         const candles = response.data.map((candle) => ({
//           time: candle[0] / 1000,
//           open: parseFloat(candle[1]),
//           high: parseFloat(candle[2]),
//           low: parseFloat(candle[3]),
//           close: parseFloat(candle[4]),
//         }));

//         updateChart(candles);
//       } catch (error) {
//         console.error("Ошибка загрузки данных с Binance:", error);
//       }
//     };

//     const createChartInstance = () => {
//       chartInstance.current = createChart(chartRef.current, {
//         layout: { textColor: "#000", background: { type: "solid", color: "#ffffff" } },
//         width: chartRef.current.clientWidth,
//         height: chartRef.current.clientHeight,
//         grid: { vertLines: { color: "#e1e1e1" }, horzLines: { color: "#e1e1e1" } },
//       });

//       seriesRef.current = chartInstance.current.addCandlestickSeries({
//         upColor: "#26a69a", downColor: "#ef5350", borderUpColor: "#26a69a", borderDownColor: "#ef5350",
//         wickUpColor: "#26a69a", wickDownColor: "#ef5350",
//       });

//       chartInstance.current.timeScale().fitContent();
//     };

//     const updateChart = (candles) => {
//       if (!chartInstance.current) createChartInstance();
//       seriesRef.current.setData(candles);
//       chartInstance.current.timeScale().setVisibleRange({
//         from: candles[candles.length - 160]?.time,
//         to: candles[candles.length - 1]?.time,
//       });
//       drawKeySupportResistance(candles);
//     };

//     const drawKeySupportResistance = (candles) => {
//       const pivots = calculatePivotPoints(candles, 10);
//       const levels = groupSupportResistanceZones(pivots, 5);
      
//       if (levels.length === 0) return;
      
//       const lastPrice = candles[candles.length - 1].close;
      
//       const closestLevel = levels.reduce((prev, curr) => 
//         Math.abs(curr.low - lastPrice) < Math.abs(prev.low - lastPrice) ? curr : prev
//       );
// candles.forEach((item) => {

//   seriesRef.current.createPriceLine({
//     price: item.close,
//     color: "#ff0000",
//     lineWidth: 2,
//     lineStyle: 0,
//     axisLabelVisible: true,
//     title: "Key S/R Level",
//   });
// })
//     };

//     fetchCandles();
//   }, [symbol, timeframe]);

//   const calculatePivotPoints = (data, period) => {
//     let pivots = [];
//     for (let i = period; i < data.length - period; i++) {
//       let high = data[i].high;
//       let low = data[i].low;
//       let isHighPivot = data.slice(i - period, i + period).every(c => c.high <= high);
//       let isLowPivot = data.slice(i - period, i + period).every(c => c.low >= low);
//       if (isHighPivot) pivots.push({ price: high, type: "high" });
//       if (isLowPivot) pivots.push({ price: low, type: "low" });
//     }
//     return pivots;
//   };

//   const groupSupportResistanceZones = (pivots, range) => {
//     let levels = [];
//     pivots.forEach(pivot => {
//       let existing = levels.find(l => Math.abs(l.low - pivot.price) < range || Math.abs(l.high - pivot.price) < range);
//       if (existing) {
//         existing.low = Math.min(existing.low, pivot.price);
//         existing.high = Math.max(existing.high, pivot.price);
//       } else {
//         levels.push({ low: pivot.price, high: pivot.price });
//       }
//     });
//     return levels;
//   };

//   return (
//     <>
//       <nav style={{ width: "100%", height: "60px", background: "black", display: "flex", gap: "20px", alignItems: "center", justifyContent: "flex-start", padding: "15px 20px" }}>
//         <label htmlFor="symbol" style={{ color: "white" }}>Choose symbol of coin</label>
//         <select name="symbol" id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
//           {symbols.map((item) => (<option key={item} value={item}>{item}</option>))}
//         </select>
//         <label htmlFor="timeframe" style={{ color: "white" }}>Choose timeframe</label>
//         <select name="timeframe" id="timeframe" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
//           {timeframes.map((item) => (<option key={item} value={item}>{item}</option>))}
//         </select>
//       </nav>
//       <div ref={chartRef} style={{ width: "100%", height: "85vh" }} />
//     </>
//   );
// };

// export default App;
