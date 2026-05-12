# Stock News Analyzer

A Chrome browser extension that analyzes stock performance relative to news events using **Gemini AI with function calling**. This project demonstrates AI agent capabilities with **real-time tool call visualization** in the UI.

## Key Features

- **AI-Powered Analysis**: Uses Gemini AI to analyze correlations between stock news and price movements
- **Function Calling Demo**: Showcases Gemini's function calling capabilities with three integrated tools
- **Real-Time Tool Call Visualization**: All tool calls are displayed in the UI for demonstration purposes, showing:
  - User queries
  - AI reasoning steps
  - Tool invocations with parameters
  - Tool results with formatted data
  - Final analysis summary
- **Interactive Trace Panel**: Step-by-step visualization of the agent's reasoning chain
- **Clean, Modern UI**: Professional interface with expandable cards for each step

## Architecture

### AI Agent Flow

The extension uses an agentic approach where Gemini AI orchestrates multiple tool calls:

1. **search_stock_news** - Fetches recent news articles about a stock
2. **get_stock_price_history** - Retrieves historical price data from Yahoo Finance
3. **analyze_news_price_impact** - Cross-references news with price movements to determine impact

### Tool Call Visualization

The UI displays each step of the agent's execution:
- **User Input**: The analysis query
- **LLM Thinking**: Gemini deciding which tool to call next
- **Tool Call**: Function name and parameters being passed
- **Tool Result**: Formatted results with sentiment analysis, price changes, and impact tables
- **Final Answer**: AI-generated summary of findings

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this directory
5. Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
6. Enter your API key in the extension popup

## Usage

1. Click the extension icon to open the popup
2. Enter your Gemini API key (saved in Chrome storage)
3. Try one of the suggested queries or enter your own:
   - "Analyze Ola Electric stock for the last 30 days"
   - "Analyze Tesla (TSLA) for the last 30 days"
   - "Analyze Apple (AAPL) stock over last 3 weeks"
4. Click **Analyze** and watch the agent work step by step
5. View the complete reasoning chain with tool calls in the trace panel

## Demo Data

This extension uses **mock data** for demonstration purposes. The tools simulate:
- Realistic stock price movements
- News headlines with sentiment analysis
- Price impact correlations

For production use, integrate with real APIs:
- [Yahoo Finance API](https://query1.finance.yahoo.com/) for stock prices
- [NewsAPI](https://newsapi.org/) or similar for news articles

## Technologies

- **Gemini 2.5 Flash**: Google's latest multimodal AI model with function calling
- **Chrome Extension Manifest V3**: Modern extension architecture
- **Vanilla JavaScript**: No frameworks, pure JS for simplicity
- **CSS3**: Modern styling with custom properties

## Project Structure

```
├── manifest.json          # Extension manifest
├── popup.html            # Extension UI
├── popup.css             # Styling
├── popup.js              # UI logic and trace handling
├── gemini.js             # Gemini API integration and agent loop
├── tools.js              # Tool declarations and executors
├── logger.js             # Debug logging utility
├── icon.png              # Extension icon
└── test_api.html         # API testing page
```

## API Configuration

The extension requires:
- **Gemini API Key**: For AI model access
- **Storage Permission**: To save API key locally
- **Host Permissions**:
  - `generativelanguage.googleapis.com` - Gemini API
  - `query1.finance.yahoo.com` - Yahoo Finance (for future integration)
  - `newsapi.org` - News API (for future integration)

## Rate Limiting

The extension includes intelligent rate limit handling:
- Automatic retry with exponential backoff
- Retry delay extraction from API responses
- User-friendly error messages with quota information

## Debug Logs

Click the download button in the status bar to export debug logs with:
- API calls and responses
- Tool executions
- Error details
- Timing information

## Development

To modify or extend the extension:

1. **Add New Tools**: Define in `tools.js` TOOL_DECLARATIONS array
2. **Customize UI**: Modify `popup.html` and `popup.css`
3. **Change Agent Behavior**: Update the system prompt in `gemini.js`
4. **Integrate Real APIs**: Replace mock data generators with API calls

## License

MIT

## Credits

Built with [Gemini AI](https://ai.google.dev/) function calling capabilities.

---

**Note**: This is a demonstration project showcasing AI agent capabilities with tool call visualization. The primary educational value is in seeing how an AI agent orchestrates multiple function calls to solve complex analytical tasks.