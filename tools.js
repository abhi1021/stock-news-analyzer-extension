// ─────────────────────────────────────────────
// TOOL DECLARATIONS (sent to Gemini)
// ─────────────────────────────────────────────
const TOOL_DECLARATIONS = [
  {
    name: "search_stock_news",
    description: "Search for recent news articles about a stock/company within a date range. Returns headline, date, source and brief summary for each article.",
    parameters: {
      type: "OBJECT",
      properties: {
        symbol: {
          type: "STRING",
          description: "Stock ticker symbol or company name, e.g. OLA, TSLA, RELIANCE"
        },
        company_name: {
          type: "STRING",
          description: "Full company name to improve news search accuracy"
        },
        start_date: {
          type: "STRING",
          description: "Start date in YYYY-MM-DD format"
        },
        end_date: {
          type: "STRING",
          description: "End date in YYYY-MM-DD format"
        }
      },
      required: ["symbol", "start_date", "end_date"]
    }
  },
  {
    name: "get_stock_price_history",
    description: "Fetch daily stock price history (open, close, high, low, volume) for a given stock symbol between two dates.",
    parameters: {
      type: "OBJECT",
      properties: {
        symbol: {
          type: "STRING",
          description: "Stock ticker symbol e.g. OLA, TSLA, RELIANCE.NS"
        },
        start_date: {
          type: "STRING",
          description: "Start date in YYYY-MM-DD format"
        },
        end_date: {
          type: "STRING",
          description: "End date in YYYY-MM-DD format"
        }
      },
      required: ["symbol", "start_date", "end_date"]
    }
  },
  {
    name: "analyze_news_price_impact",
    description: "Cross-reference news articles with stock price data to find what price movement happened on or just after each news date. Returns a structured impact table.",
    parameters: {
      type: "OBJECT",
      properties: {
        symbol: {
          type: "STRING",
          description: "Stock ticker symbol"
        },
        news_items: {
          type: "ARRAY",
          description: "Array of news objects with date and headline fields",
          items: { type: "OBJECT" }
        },
        price_series: {
          type: "ARRAY",
          description: "Array of daily price objects with date, open, close fields",
          items: { type: "OBJECT" }
        }
      },
      required: ["symbol", "news_items", "price_series"]
    }
  }
];

// ─────────────────────────────────────────────
// MOCK DATA GENERATOR (realistic demo data)
// ─────────────────────────────────────────────
function generateMockPrices(symbol, startDate, endDate) {
  const prices = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  let price = symbol.toUpperCase().includes("OLA") ? 82.5 :
               symbol.toUpperCase().includes("TSLA") ? 245.0 : 150.0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    const change = (Math.random() - 0.48) * 3.5;
    const open = parseFloat(price.toFixed(2));
    price = parseFloat((price + change).toFixed(2));
    if (price < 1) price = 1;
    prices.push({
      date: d.toISOString().split("T")[0],
      open: open,
      close: price,
      high: parseFloat((Math.max(open, price) + Math.random() * 1.5).toFixed(2)),
      low: parseFloat((Math.min(open, price) - Math.random() * 1.5).toFixed(2)),
      volume: Math.floor(Math.random() * 5000000 + 1000000)
    });
  }
  return prices;
}

function generateMockNews(symbol, startDate, endDate) {
  const companyName = symbol.toUpperCase().includes("OLA") ? "Ola Electric" :
                      symbol.toUpperCase().includes("TSLA") ? "Tesla" : symbol;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const allNews = [
    { daysFromStart: 2,  headline: `${companyName} reports strong quarterly sales growth`, sentiment: "positive", source: "Economic Times" },
    { daysFromStart: 5,  headline: `${companyName} faces regulatory scrutiny over safety standards`, sentiment: "negative", source: "Bloomberg" },
    { daysFromStart: 9,  headline: `${companyName} announces new product launch and expansion plans`, sentiment: "positive", source: "Reuters" },
    { daysFromStart: 14, headline: `Analyst downgrades ${companyName} citing margin concerns`, sentiment: "negative", source: "Moneycontrol" },
    { daysFromStart: 18, headline: `${companyName} signs major partnership deal worth ₹2,000 crore`, sentiment: "positive", source: "NDTV Profit" },
    { daysFromStart: 22, headline: `${companyName} CEO addresses investor concerns in earnings call`, sentiment: "neutral", source: "Business Standard" },
    { daysFromStart: 26, headline: `${companyName} stock upgraded to BUY by Goldman Sachs`, sentiment: "positive", source: "Financial Express" },
  ];

  return allNews
    .map(n => {
      const d = new Date(start);
      d.setDate(d.getDate() + n.daysFromStart);
      if (d > end) return null;
      return {
        date: d.toISOString().split("T")[0],
        headline: n.headline,
        sentiment: n.sentiment,
        source: n.source,
        url: "#"
      };
    })
    .filter(Boolean);
}

// ─────────────────────────────────────────────
// TOOL EXECUTORS
// ─────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    case "search_stock_news":
      return toolSearchStockNews(args);
    case "get_stock_price_history":
      return toolGetStockPriceHistory(args);
    case "analyze_news_price_impact":
      return toolAnalyzeNewsImpact(args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function toolSearchStockNews(args) {
  // Simulate async API call
  await new Promise(r => setTimeout(r, 600));
  const news = generateMockNews(args.symbol, args.start_date, args.end_date);
  return {
    symbol: args.symbol,
    total_articles: news.length,
    articles: news
  };
}

async function toolGetStockPriceHistory(args) {
  await new Promise(r => setTimeout(r, 700));
  const prices = generateMockPrices(args.symbol, args.start_date, args.end_date);
  const first = prices[0]?.close || 0;
  const last = prices[prices.length - 1]?.close || 0;
  return {
    symbol: args.symbol,
    start_date: args.start_date,
    end_date: args.end_date,
    total_trading_days: prices.length,
    start_price: first,
    end_price: last,
    total_change_pct: (((last - first) / first) * 100).toFixed(2),
    prices: prices
  };
}

async function toolAnalyzeNewsImpact(args) {
  await new Promise(r => setTimeout(r, 400));

  const priceMap = {};
  (args.price_series || []).forEach(p => {
    priceMap[p.date] = p;
  });

  const priceDates = Object.keys(priceMap).sort();

  function findNextTradingDay(dateStr, offset = 1) {
    const idx = priceDates.indexOf(dateStr);
    if (idx === -1) {
      // find closest
      const closest = priceDates.find(d => d >= dateStr);
      if (!closest) return null;
      const ci = priceDates.indexOf(closest);
      return priceDates[ci + offset - 1] || null;
    }
    return priceDates[idx + offset] || null;
  }

  const impacts = (args.news_items || []).map(news => {
    const newsDate = news.date;
    const sameDayPrice = priceMap[newsDate];
    const nextDay1 = findNextTradingDay(newsDate, 1);
    const nextDay2 = findNextTradingDay(newsDate, 2);

    const p0 = sameDayPrice ? sameDayPrice.close :
                (priceMap[priceDates.find(d => d < newsDate && d)] || null)?.close || null;
    const p1 = nextDay1 ? priceMap[nextDay1]?.close : null;
    const p2 = nextDay2 ? priceMap[nextDay2]?.close : null;

    const change1d = (p0 && p1) ? (((p1 - p0) / p0) * 100).toFixed(2) : "N/A";
    const change2d = (p0 && p2) ? (((p2 - p0) / p0) * 100).toFixed(2) : "N/A";

    return {
      news_date: newsDate,
      headline: news.headline,
      sentiment: news.sentiment,
      price_on_date: p0,
      price_next_day: p1,
      price_2d_later: p2,
      change_1d_pct: change1d,
      change_2d_pct: change2d,
      likely_impact: news.sentiment === "positive" && parseFloat(change1d) > 0 ? "Confirmed positive move" :
                     news.sentiment === "negative" && parseFloat(change1d) < 0 ? "Confirmed negative move" :
                     news.sentiment === "positive" && parseFloat(change1d) < 0 ? "Positive news, stock dipped (likely other factors)" :
                     news.sentiment === "negative" && parseFloat(change1d) > 0 ? "Negative news, stock rose (market discounted or rebounded)" :
                     "Neutral/mixed signal"
    };
  });

  return {
    symbol: args.symbol,
    analysis_count: impacts.length,
    impact_table: impacts
  };
}
