import React, { useState, useEffect } from 'react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bitcoin, Hexagon, Star, Activity, PieChart, ArrowUp, ArrowDown } from 'lucide-react';
import './CryptoChart.css';

const CryptoDashboard = () => {
  const [activeTimeframe, setActiveTimeframe] = useState("30d");
  const [chartData, setChartData] = useState([]);
  const [chartType, setChartType] = useState("area");
  const [selectedCoin, setSelectedCoin] = useState("bitcoin");
  const [isLoading, setIsLoading] = useState(true);
  
  // Store historical data for each coin
  const [bitcoinData, setBitcoinData] = useState([]);
  const [coreData, setCoreData] = useState([]);
  const [stCoreData, setStCoreData] = useState([]);
  const [lstBtcData, setLstBtcData] = useState([]);
  const [dualCoreData, setDualCoreData] = useState([]);
  
  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch bitcoin data
        const bitcoinResponse = await fetch(`http://127.0.0.1:8000/coins/bitcoin/history?days=${getDaysParameter()}`);
        if (!bitcoinResponse.ok) throw new Error('Failed to fetch Bitcoin data');
        const bitcoinJson = await bitcoinResponse.json();
        
        // Fetch core data
        const coreResponse = await fetch(`http://127.0.0.1:8000/coins/core/history?days=${getDaysParameter()}`);
        if (!coreResponse.ok) throw new Error('Failed to fetch CORE data');
        const coreJson = await coreResponse.json();
        
        // Process the data
        const processedBitcoinData = processApiData(bitcoinJson.prices);
        const processedCoreData = processApiData(coreJson.prices);
        
        // Generate synthetic data for the other tokens based on real data
        const processedStCoreData = generateStCoreData(processedCoreData);
        const processedLstBtcData = generateLstBtcData(processedBitcoinData);
        const processedDualCoreData = generateDualCoreData(processedCoreData);
        
        // Store the data
        setBitcoinData(processedBitcoinData);
        setCoreData(processedCoreData);
        setStCoreData(processedStCoreData);
        setLstBtcData(processedLstBtcData);
        setDualCoreData(processedDualCoreData);
        
        // Set chart data based on selected coin
        updateChartData(
          selectedCoin, 
          processedBitcoinData, 
          processedCoreData, 
          processedStCoreData, 
          processedLstBtcData, 
          processedDualCoreData
        );
      } catch (error) {
        console.error("Error fetching data:", error);
        // Fallback to sample data if API fails
        generateFallbackData();
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [activeTimeframe]);
  
  // Update chart data when selected coin changes
  useEffect(() => {
    updateChartData(
      selectedCoin, 
      bitcoinData, 
      coreData, 
      stCoreData, 
      lstBtcData, 
      dualCoreData
    );
  }, [selectedCoin]);
  
  // Convert timeframe to days parameter for API
  const getDaysParameter = () => {
    switch(activeTimeframe) {
      case "15d": return 15;
      case "30d": return 30;
      case "90d": return 90;
      case "180d": return 180;
      default: return 30;
    }
  };
  
  // Process API data into chart format
  const processApiData = (priceData) => {
    if (!priceData || !Array.isArray(priceData) || priceData.length === 0) {
      return [];
    }
    
    return priceData.map(dataPoint => {
      const timestamp = dataPoint[0];
      const price = dataPoint[1];
      const date = new Date(timestamp);
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: timestamp,
        price: price,
        fullDate: date
      };
    });
  };
  
  // Generate synthetic data for stCORE based on CORE data
  const generateStCoreData = (coreData) => {
    return coreData.map(dataPoint => ({
      ...dataPoint,
      price: dataPoint.price * 1.1 + 0.05 // stCORE is generally 10% more valuable than CORE
    }));
  };
  
  // Generate synthetic data for lstBTC based on Bitcoin data
  const generateLstBtcData = (bitcoinData) => {
    return bitcoinData.map(dataPoint => ({
      ...dataPoint,
      price: dataPoint.price * 1.02 - 100 // lstBTC usually has a slight premium over BTC
    }));
  };
  
  // Generate synthetic data for dualCORE based on CORE data
  const generateDualCoreData = (coreData) => {
    return coreData.map(dataPoint => ({
      ...dataPoint,
      price: dataPoint.price * 1.25 + 0.1 // dualCORE has higher value than CORE
    }));
  };
  
  // Update chart data based on selected coin
  const updateChartData = (coin, btcData, coreData, stCoreData, lstBtcData, dualCoreData) => {
    let data;
    
    switch(coin) {
      case "bitcoin":
        data = btcData;
        break;
      case "core":
        data = coreData;
        break;
      case "stcore":
        data = stCoreData;
        break;
      case "lstbtc":
        data = lstBtcData;
        break;
      case "dualcore":
        data = dualCoreData;
        break;
      default:
        data = btcData;
    }
    
    setChartData(data);
  };
  
  // Fallback data generation if API fails
  const generateFallbackData = () => {
    console.log("Using fallback data generation");
    const data = [];
    const btcData = [];
    const coreData = [];
    const now = new Date();
    let daysToGenerate = 180;
    
    for (let i = daysToGenerate; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const btcPrice = 65000 + (Math.sin(i/15) * 3000) + (Math.random() * 1500) - (i * 50);
      const corePrice = 2.50 + (Math.sin(i/15) * 0.3) + (Math.random() * 0.15) - (i * 0.005);
      
      btcData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: date.getTime(),
        price: btcPrice,
        fullDate: date
      });
      
      coreData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: date.getTime(),
        price: corePrice,
        fullDate: date
      });
    }
    
    const stCoreData = generateStCoreData(coreData);
    const lstBtcData = generateLstBtcData(btcData);
    const dualCoreData = generateDualCoreData(coreData);
    
    setBitcoinData(btcData);
    setCoreData(coreData);
    setStCoreData(stCoreData);
    setLstBtcData(lstBtcData);
    setDualCoreData(dualCoreData);
    
    // Set chart data based on selected coin
    updateChartData(
      selectedCoin, 
      btcData, 
      coreData, 
      stCoreData, 
      lstBtcData, 
      dualCoreData
    );
  };

  // Calculate price metrics
  const getLatestPrice = () => {
    if (chartData.length === 0) return 0;
    return chartData[chartData.length - 1].price;
  };

  const calculateChange = (days) => {
    if (chartData.length <= days) return 0;
    const latest = chartData[chartData.length - 1].price;
    const previous = chartData[chartData.length - 1 - days].price;
    return ((latest - previous) / previous) * 100;
  };

  const formatPrice = (price) => {
    if (selectedCoin === "bitcoin" || selectedCoin === "lstbtc") {
      return "$" + Math.round(price).toLocaleString();
    } else {
      return "$" + price.toFixed(2);
    }
  };

  const formatChange = (change) => {
    return change.toFixed(2) + "%";
  };

  const renderChart = () => {
    if (isLoading) {
      return <div className="chart-loading">Loading chart data...</div>;
    }
    
    if (chartData.length === 0) {
      return <div className="chart-error">No data available</div>;
    }
    
    switch(chartType) {
      case "area":
        return (
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff7700" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ff7700" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tickMargin={10}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickCount={7}
            />
            <YAxis 
              domain={['auto', 'auto']}
              axisLine={false} 
              tickLine={false} 
              tickMargin={10}
              tickFormatter={(value) => (selectedCoin === "bitcoin" || selectedCoin === "lstbtc") ? `$${Math.round(value/1000)}k` : `$${value.toFixed(2)}`}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              width={60}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <Tooltip 
              formatter={(value) => formatPrice(value)}
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px'
              }}
              itemStyle={{ color: '#f8fafc' }}
              labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '6px' }}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="#ff7700" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
              name="Price"
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        );
      case "line":
        return (
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tickMargin={10}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickCount={7}
            />
            <YAxis 
              domain={['auto', 'auto']}
              axisLine={false} 
              tickLine={false} 
              tickMargin={10}
              tickFormatter={(value) => (selectedCoin === "bitcoin" || selectedCoin === "lstbtc") ? `$${Math.round(value/1000)}k` : `$${value.toFixed(2)}`}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              width={60}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <Tooltip 
              formatter={(value) => formatPrice(value)}
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px'
              }}
              itemStyle={{ color: '#f8fafc' }}
              labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '6px' }}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#ff7700" 
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="Price"
            />
          </LineChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="crypto-dashboard">
      {/* Premium Cards */}
      <div className="premium-cards">
        <div className={`premium-card btc ${selectedCoin === 'bitcoin' ? 'active' : ''}`} onClick={() => setSelectedCoin('bitcoin')}>
          <div className="premium-card-header">
            <div className="premium-card-icon">
              <Bitcoin size={24} />
            </div>
            <div className="premium-card-title">Bitcoin</div>
            <div className="premium-card-badge">BTC</div>
          </div>
          
          <div className="premium-card-content">
            <div className="premium-card-value">
              {bitcoinData.length > 0 
                ? formatPrice(bitcoinData[bitcoinData.length - 1].price) 
                : "$64,755"}
            </div>
            <div className={`premium-card-change ${bitcoinData.length > 1 && bitcoinData[bitcoinData.length - 1].price >= bitcoinData[bitcoinData.length - 2].price ? 'positive' : 'negative'}`}>
              {bitcoinData.length > 1 && bitcoinData[bitcoinData.length - 1].price >= bitcoinData[bitcoinData.length - 2].price 
                ? <ArrowUp size={16} /> 
                : <ArrowDown size={16} />} 
              {bitcoinData.length > 1 
                ? formatChange(((bitcoinData[bitcoinData.length - 1].price - bitcoinData[bitcoinData.length - 2].price) / bitcoinData[bitcoinData.length - 2].price) * 100) 
                : "3.4%"}
            </div>
          </div>
          
          <div className="premium-card-footer">
            <div className="premium-card-metric">
              <div className="metric-label">24h Volume</div>
              <div className="metric-value">$38.5B</div>
            </div>
            <div className="premium-card-metric">
              <div className="metric-label">Market Cap</div>
              <div className="metric-value">$1.24T</div>
            </div>
          </div>
          
          <div className="premium-card-bg-icon">
            <Bitcoin size={140} />
          </div>
        </div>
        
        <div className={`premium-card core ${selectedCoin === 'core' ? 'active' : ''}`} onClick={() => setSelectedCoin('core')}>
          <div className="premium-card-header">
            <div className="premium-card-icon">
              <Hexagon size={24} />
            </div>
            <div className="premium-card-title">CORE</div>
            <div className="premium-card-badge">CORE</div>
          </div>
          
          <div className="premium-card-content">
            <div className="premium-card-value">
              {coreData.length > 0 
                ? formatPrice(coreData[coreData.length - 1].price) 
                : "$2.58"}
            </div>
            <div className={`premium-card-change ${coreData.length > 1 && coreData[coreData.length - 1].price >= coreData[coreData.length - 2].price ? 'positive' : 'negative'}`}>
              {coreData.length > 1 && coreData[coreData.length - 1].price >= coreData[coreData.length - 2].price 
                ? <ArrowUp size={16} /> 
                : <ArrowDown size={16} />} 
              {coreData.length > 1 
                ? formatChange(((coreData[coreData.length - 1].price - coreData[coreData.length - 2].price) / coreData[coreData.length - 2].price) * 100) 
                : "5.7%"}
            </div>
          </div>
          
          <div className="premium-card-footer">
            <div className="premium-card-metric">
              <div className="metric-label">24h Volume</div>
              <div className="metric-value">$425M</div>
            </div>
            <div className="premium-card-metric">
              <div className="metric-label">Market Cap</div>
              <div className="metric-value">$258M</div>
            </div>
          </div>
          
          <div className="premium-card-bg-icon">
            <Hexagon size={140} />
          </div>
        </div>
      </div>
      
      {/* Secondary Row with stCORE, lstBTC, and dualCORE Cards */}
      <div className="secondary-cards">
        <div className={`stats-card accent ${selectedCoin === 'stcore' ? 'active' : ''}`} onClick={() => setSelectedCoin('stcore')}>
          <div className="stats-card-icon stcore">
            <Star size={20} />
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-title">stCORE</h3>
            <div className="stats-card-value">
              {stCoreData.length > 0 
                ? formatPrice(stCoreData[stCoreData.length - 1].price) 
                : "$2.82"}
            </div>
            <div className={`stats-card-change ${stCoreData.length > 1 && stCoreData[stCoreData.length - 1].price >= stCoreData[stCoreData.length - 2].price ? 'positive' : 'negative'}`}>
              {stCoreData.length > 1 && stCoreData[stCoreData.length - 1].price >= stCoreData[stCoreData.length - 2].price 
                ? <ArrowUp size={14} /> 
                : <ArrowDown size={14} />} 
              {stCoreData.length > 1 
                ? formatChange(((stCoreData[stCoreData.length - 1].price - stCoreData[stCoreData.length - 2].price) / stCoreData[stCoreData.length - 2].price) * 100) 
                : "6.1%"}
            </div>
            <div className="stats-card-prev">APY: 9.5%</div>
          </div>
          <div className="stats-card-arrow">
            {stCoreData.length > 1 && stCoreData[stCoreData.length - 1].price >= stCoreData[stCoreData.length - 2].price 
              ? <ArrowUp size={16} /> 
              : <ArrowDown size={16} className="down" />}
          </div>
        </div>

        <div className={`stats-card ${selectedCoin === 'lstbtc' ? 'active' : ''}`} onClick={() => setSelectedCoin('lstbtc')}>
          <div className="stats-card-icon lstbtc">
            <Activity size={20} />
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-title">lstBTC</h3>
            <div className="stats-card-value">
              {lstBtcData.length > 0 
                ? formatPrice(lstBtcData[lstBtcData.length - 1].price) 
                : "$64,821"}
            </div>
            <div className={`stats-card-change ${lstBtcData.length > 1 && lstBtcData[lstBtcData.length - 1].price >= lstBtcData[lstBtcData.length - 2].price ? 'positive' : 'negative'}`}>
              {lstBtcData.length > 1 && lstBtcData[lstBtcData.length - 1].price >= lstBtcData[lstBtcData.length - 2].price 
                ? <ArrowUp size={14} /> 
                : <ArrowDown size={14} />} 
              {lstBtcData.length > 1 
                ? formatChange(((lstBtcData[lstBtcData.length - 1].price - lstBtcData[lstBtcData.length - 2].price) / lstBtcData[lstBtcData.length - 2].price) * 100) 
                : "1.2%"}
            </div>
            <div className="stats-card-prev">Premium: +1.7%</div>
          </div>
          <div className="stats-card-arrow">
            {lstBtcData.length > 1 && lstBtcData[lstBtcData.length - 1].price >= lstBtcData[lstBtcData.length - 2].price 
              ? <ArrowUp size={16} /> 
              : <ArrowDown size={16} className="down" />}
          </div>
        </div>

        <div className={`stats-card ${selectedCoin === 'dualcore' ? 'active' : ''}`} onClick={() => setSelectedCoin('dualcore')}>
          <div className="stats-card-icon dualcore">
            <PieChart size={20} />
          </div>
          <div className="stats-card-content">
            <h3 className="stats-card-title">dualCORE</h3>
            <div className="stats-card-value">
              {dualCoreData.length > 0 
                ? formatPrice(dualCoreData[dualCoreData.length - 1].price) 
                : "$3.14"}
            </div>
            <div className={`stats-card-change ${dualCoreData.length > 1 && dualCoreData[dualCoreData.length - 1].price >= dualCoreData[dualCoreData.length - 2].price ? 'positive' : 'negative'}`}>
              {dualCoreData.length > 1 && dualCoreData[dualCoreData.length - 1].price >= dualCoreData[dualCoreData.length - 2].price 
                ? <ArrowUp size={14} /> 
                : <ArrowDown size={14} />} 
              {dualCoreData.length > 1 
                ? formatChange(((dualCoreData[dualCoreData.length - 1].price - dualCoreData[dualCoreData.length - 2].price) / dualCoreData[dualCoreData.length - 2].price) * 100) 
                : "8.2%"}
            </div>
            <div className="stats-card-prev">APY: 12.5%</div>
          </div>
          <div className="stats-card-arrow">
            {dualCoreData.length > 1 && dualCoreData[dualCoreData.length - 1].price >= dualCoreData[dualCoreData.length - 2].price 
              ? <ArrowUp size={16} /> 
              : <ArrowDown size={16} className="down" />}
          </div>
        </div>
      </div>
      
      {/* Chart Section */}
      <div className="chart-section">
        <div className="chart-header">
          <div className="chart-title-container">
            <h2 className="chart-title">
              {selectedCoin === 'bitcoin' ? 'Bitcoin' : 
               selectedCoin === 'core' ? 'CORE' : 
               selectedCoin === 'stcore' ? 'stCORE' :
               selectedCoin === 'lstbtc' ? 'lstBTC' :
               'dualCORE'} Price Chart
            </h2>
            <p className="chart-subtitle">
              Historical price data and performance metrics
            </p>
          </div>
          
          {/* Chart Type Selector */}
          <div className="chart-type-selector">
            <button 
              onClick={() => setChartType("area")}
              className={`chart-type-btn ${chartType === "area" ? "active" : ""}`}
            >
              Area
            </button>
            <button 
              onClick={() => setChartType("line")}
              className={`chart-type-btn ${chartType === "line" ? "active" : ""}`}
            >
              Line
            </button>
          </div>
        </div>
        
        {/* Time Frame Tabs */}
        <div className="timeframe-tabs">
          <button 
            onClick={() => setActiveTimeframe("15d")} 
            className={`timeframe-tab ${activeTimeframe === "15d" ? "active" : ""}`}
          >
            15 Days
          </button>
          <button 
            onClick={() => setActiveTimeframe("30d")} 
            className={`timeframe-tab ${activeTimeframe === "30d" ? "active" : ""}`}
          >
            30 Days
          </button>
          <button 
            onClick={() => setActiveTimeframe("90d")} 
            className={`timeframe-tab ${activeTimeframe === "90d" ? "active" : ""}`}
          >
            3 Months
          </button>
          <button 
            onClick={() => setActiveTimeframe("180d")} 
            className={`timeframe-tab ${activeTimeframe === "180d" ? "active" : ""}`}
          >
            6 Months
          </button>
        </div>
        
        {/* Chart Container */}
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CryptoDashboard;