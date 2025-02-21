import { createChart } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  const chartRef = useRef(null);
  const [symbols, setSymbols] = useState([]);
  const [symbol, setSymbol] = useState("ETHUSDT");
  const [timeframe, setTimeframe] = useState("4h");
  const chartInstance = useRef(null);
  const seriesRef = useRef(null);
  const [unicalRange, setUnicalRange] = useState(null)

  const timeframes = ["1d", "4h", "1h"];
  
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const response = await axios.get("https://api.binance.com/api/v3/exchangeInfo");
        const usdtPairs = response.data.symbols
          .filter((s) => s.symbol.endsWith("USDT") && s.status === "TRADING")
          .map((s) => s.symbol);
        setSymbols(usdtPairs);
        setSymbol(symbol);
      } catch (error) {
        console.error("Ошибка загрузки символов с Binance:", error);
      }
    };
    fetchSymbols();
  }, []);

  useEffect(() => {
    if (!symbol) return;

    const fetchCandles = async () => {
      try {
        const response = await axios.get("https://api.binance.com/api/v3/klines", {
          params: { symbol, interval: timeframe, limit: 1000 },
        });

        const candles = response.data.map((candle) => ({
          time: candle[0] / 1000,
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
        }));

        updateChart(candles);
      } catch (error) {
        console.error("Ошибка загрузки данных с Binance:", error);
      }
    };
    
    const createChartInstance = () => {
      // Если график уже создан, не создаем новый
      if (chartInstance.current) {
        chartInstance.current.remove();
      }

      chartInstance.current = createChart(chartRef.current, {
        layout: { textColor: "#000", background: { type: "solid", color: "#ffffff" } },
        width: chartRef.current.clientWidth,
        height: chartRef.current.clientHeight,
        crosshair: { mode: 0, vertLine:{style: 0}, horzLine:{style: 0}}
      });

      seriesRef.current = chartInstance.current.addCandlestickSeries({
        upColor: "#26a69a", downColor: "#ef5350", borderUpColor: "#26a69a", borderDownColor: "#ef5350",
        wickUpColor: "#26a69a", wickDownColor: "#ef5350",
      });
    };
    createChartInstance()

    const updateChart = (candles) => {
      if (!chartInstance.current) {
        createChartInstance();
      }
      seriesRef.current.setData(candles);
      analyzeSupportResistance(candles);
    };

    const analyzeSupportResistance = (candles) => {
      const markers = [];
      const markersForPivots = []
      const currentPrice = candles[candles.length - 1].close

      const checkIsExtremum = (i) => {
        if (i < 5 || i + 5 >= candles.length) return false;

        const before = candles.slice(i - 5, i);
        const after = candles.slice(i + 1, i + 6);

        const isHighest = before.every(c => c.high < candles[i].high) && after.every(c => c.high < candles[i].high);
        const isLowest = before.every(c => c.low > candles[i].low) && after.every(c => c.low > candles[i].low);

        return isHighest || isLowest;
      };

      // const checkLimit = candles.length > 20 ? candles.length - 20 : 0;
      // for (let i = checkLimit; i < candles.length; i++) {
      //   const current = candles[i];

      //   if (checkIsExtremum(i)) {
      //     const isHighest = current.high > candles[i - 1].high;
      //     const isLowest = current.low < candles[i - 1].low;

      //     if (isHighest || isLowest) {
      //       const price = isHighest ? current.high : current.low;
      //       const date = current.time
      //       levels.push({ price, isHighest, isLowest, date });
      //     }
      //   }
      // }

      // support / resistance zone
      for (let i = 0; i < candles.length; i++) {
        const current = candles[i];

        if (checkIsExtremum(i)) {
          const isHighest = current.high > candles[i - 1].high;
          const isLowest = current.low < candles[i - 1].low;

          if (isHighest || isLowest) {
            const price = isHighest ? current.high : current.low;
            const date = current.time
            markersForPivots.push({ price, isHighest, isLowest, date });
          }
        }
      }
      //

      const range = calculateRange(candles);
      setUnicalRange(range)
      const groupedLevels = groupSupport(currentPrice, range, candles);

      // if (groupedLevels.length > 0) {
        groupedLevels.forEach((item) => {
          seriesRef.current.createPriceLine({
            price: item,
            color: '#ff0000',
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
          });
        })
        markersForPivots.forEach((item) => {
          seriesRef.current.createPriceLine({
            price: item.price,
            color: '#03fd8861',
            lineWidth: 2,
            lineStyle: 1,
            axisLabelVisible: true,
          });
        })
      // }
      // else if(levels.length){
        markersForPivots.forEach((item) =>{
          markers.push({
            time: item.date,  
            position: item.isHighest ? 'aboveBar' : 'belowBar',
            color: item.isHighest ? 'green' : 'red',
            shape: item.isHighest ? 'arrowDown' : 'arrowUp',
          });
        })
      // }

      seriesRef.current.setMarkers(markers);
      console.warn(range);
      console.log(groupedLevels);
    };

    const groupSupport = (currentPrice, range, candles) => {
      let AGroup = [];
      let BGroup = [];
      let glob = [];
      let hightesPrice = Math.max(...candles.map((item) => item.close))
      let lowestPrice = Math.min(...candles.map((item) => item.open))
      
      let priceForB = currentPrice;
    
      for (let i = currentPrice; i > 0; i--) {
        if (candles.length) {
          let group1 = currentPrice - range;
          glob.push(group1);
          currentPrice -= range;
    
          if (currentPrice <= lowestPrice) break;
        }
      }
    
      // Для BGroup: увеличиваем сохраненное значение currentPrice
      for (let i = priceForB; i > 0; i--) {
        if (candles.length) {
          let group2 = priceForB + range;
          glob.push(group2);
          priceForB += range;
          if(priceForB >= hightesPrice) break;
        }
      }
    
      // glob.push({ AGroup, BGroup });
      return glob;
    };
    

    const calculateRange = (candles) => {
      let highSum = 0;
      let lowSum = 0;

      for (let i = 0; i < 100; i++) {
        highSum += candles[i].high;
        lowSum += candles[i].low;
      }

      const range = (highSum - lowSum) / 20;
      return range;
    };

    fetchCandles();
  }, [symbol, timeframe]);

  return (
    <>
      <nav style={{ width: "100%", height: "60px", background: "black", display: "flex", gap: "20px", alignItems: "center", justifyContent: "flex-start", padding: "15px 20px" }}>
        <label htmlFor="symbol" style={{ color: "white" }}>Choose symbol</label>
        <select name="symbol" id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {symbols.map((item) => (<option key={item} value={item}>{item}</option>))}
        </select>
        <label htmlFor="timeframe" style={{ color: "white" }}>Choose timeframe</label>
        <select name="timeframe" id="timeframe" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
          {timeframes.map((item) => (<option key={item} value={item}>{item}</option>))}
        </select>
      </nav>
      <div ref={chartRef} style={{ width: "100%", height: "85vh" }} />
      <h1 style={{position: 'absolute', fontSize: '40px', color: 'black', fontFamily: 'sans-serif', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: '100', opacity: 0.9, textShadow: '0px 0px 5px black'}}>
        {`ATR: ${unicalRange}`}
      </h1>
    </>
  );
};

export default App;