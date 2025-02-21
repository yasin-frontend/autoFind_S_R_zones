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
  const [active, setActive] = useState(false)

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

      seriesRef.current.createPriceLine({
        price: candles[candles.length - 1].close, // Последняя свеча (актуальная цена)
        color: !active ? '#ff0000' : '#26a69a', // Цвет линии
        lineWidth: 2,
        lineStyle: !active ? 0 : 1, // Пунктирная линия (0 — сплошная, 2 — пунктирная)
        axisLabelVisible: false,
      });
      seriesRef.current.applyOptions({
        price: candles[candles.length - 1].close,
        color: !active ? '#ff0000' : '#26a69a',
        lineWidth: 2,
      lineStyle: active ? 2 : 0, 
      })
    };

    const processMarkers = (groupedLevels, markersForPivots) => {
      const newMarkers = [];
      
      for (let i = 0; i < groupedLevels.length - 1; i++) {
        const lowerBound = groupedLevels[i];
        const upperBound = groupedLevels[i + 1];
        const pivotsInRange = markersForPivots.filter(m => m.price > lowerBound && m.price < upperBound);
        
        if (pivotsInRange.length > 0) {
          const averagePrice = pivotsInRange.reduce((sum, m) => sum + m.price, 0) / pivotsInRange.length;
          newMarkers.push({ price: averagePrice, color: '#03fd88a7', lineWidth: 2, lineStyle: 1, axisLabelVisible: true });
        }
      }
      
      return newMarkers;
    };
    
    const analyzeSupportResistance = (candles) => {
      const markers = [];
      const markersForPivots = [];
      const currentPrice = candles[candles.length - 1].close;
    
      const checkIsExtremum = (i) => {
        if (i < 5 || i + 5 >= candles.length) return false;
        const before = candles.slice(i - 5, i);
        const after = candles.slice(i + 1, i + 6);
        const isHighest = before.every(c => c.high < candles[i].high) && after.every(c => c.high < candles[i].high);
        const isLowest = before.every(c => c.low > candles[i].low) && after.every(c => c.low > candles[i].low);
        return isHighest || isLowest;
      };
    
      for (let i = 0; i < candles.length; i++) {
        if (checkIsExtremum(i)) {
          const current = candles[i];
          const isHighest = current.high > candles[i - 1].high;
          const isLowest = current.low < candles[i - 1].low;
          markersForPivots.push({ price: isHighest ? current.high : current.low, date: current.time, isHighest, isLowest });
        }
      }
    
      const range = calculateRange(candles);
      setUnicalRange(range);
      const groupedLevels = groupSupport(currentPrice, range, candles);
    
      if (!active) {
        groupedLevels.forEach((item) => {
          seriesRef.current.createPriceLine({
            price: item, 
            color: '#ff0000', 
            lineWidth: 2, 
            lineStyle: 0, 
            axisLabelVisible: true
          });
        });
      }
    
      // Обработка markersForPivots и замена их на усреднённые уровни
      const adjustedMarkers = processMarkers(groupedLevels, markersForPivots);

      adjustedMarkers.forEach((item) => {
        seriesRef.current.createPriceLine(item);
      });
    
      // Добавляем маркеры на график
      markersForPivots.forEach((item) => {
        markers.push({
          time: item.date,
          position: item.isHighest ? 'aboveBar' : 'belowBar',
          color: item.isHighest ? 'green' : 'red',
          shape: item.isHighest ? 'arrowDown' : 'arrowUp',
        });
      });
    
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
  }, [symbol, timeframe, active]);
  console.log(active);
  
  return (
    <>
      <nav style={{ width: "100%", height: "60px", background: "black", display: "flex", gap: "30px", alignItems: "center", justifyContent: "flex-start", padding: "15px 20px" }}>
        <label htmlFor="symbol" style={{ color: "white" }}>Choose symbol</label>
        <select name="symbol" id="symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {symbols.map((item) => (<option key={item} value={item}>{item}</option>))}
        </select>
        <label htmlFor="timeframe" style={{ color: "white" }}>Choose timeframe</label>
        <select name="timeframe" id="timeframe" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
          {timeframes.map((item) => (<option key={item} value={item}>{item}</option>))}
        </select>
        <h1 style={{color: '#26a69a', fontSize: '30px'}}>{`ATR: ${unicalRange}`}</h1>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px'}}>
          <p style={{color: 'white', fontSize: '20px'}}>hide S/R lines</p>
          <input type="checkbox" style={{fontSize: '40px', width: '20px', height: '20px'}} onChange={() => setActive(!active)} />
        </div>
      </nav>
      <div ref={chartRef} style={{ width: "100%", height: "85vh" }} />
    </>
  );
};

export default App;