const BASE_ENDPOINT = 'https://fapi.binance.com';
const WEBSOCKET_ENDPOINT = 'wss://fstream.binance.com/ws';

const symbolSelectElement = document.getElementById('symbol');
const intervalSelectElement = document.getElementById('interval');
const tradesListElement = document.querySelector('.trades-container__list');


let candlesStream = aggTradesStream = null;

const chart = LightweightCharts.createChart(
    document.getElementById('chart'), 
    {
        layout: {
            backgroundColor: '#000000',
            textColor: 'rgba(255, 255, 255, 0.7)',
        },
        grid: {
            vertLines: {
                color: 'rgba(255, 255, 255, 0.1)',
            },
            horzLines: {
                color: 'rgba(255, 255, 255, 0.1)',
            },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        timeScale: {
            timeVisible: true,
        }
    }
    );

    window.addEventListener('resize', () => {
        chart.resize(
            document.documentElement.clientWidth * 4 / 5, 
            document.documentElement.clientHeight * 4 / 5,
        )
    })


    const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#11FF11',
        borderUpColor: '#11FF11',
        wickUpColor: '#11FF11',
        downColor: '#FF1111',
        borderDownColor: '#FF1111',
        wickDownColor: '#FF1111',
    });


    symbolSelectElement.addEventListener('change', () => {
        candlesStream.close();
        aggTradesStream.close();

        tradesListElement.innerHTML = '';

        const symbol = symbolSelectElement.value; 
        const interval = intervalSelectElement.value;

        setHistoryCandles(symbol, interval);
        streamCandles(symbol, interval);
        streamAggTrades(symbol);
    });

    intervalSelectElement.addEventListener('change', () => {
        candlesStream.close();

        const symbol = symbolSelectElement.value; 
        const interval = intervalSelectElement.value;

        setHistoryCandles(symbol, interval);
        streamCandles(symbol, interval);
    });
    
    const symbol = symbolSelectElement.value; 
    const interval = intervalSelectElement.value;

    setHistoryCandles(symbol, interval);
    streamCandles(symbol, interval);
    streamAggTrades(symbol);

    function setHistoryCandles(symbol, interval) {
        fetch(`${BASE_ENDPOINT}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=1500`)
            .then(resp => resp.json())
            .then(candlesArr => candlestickSeries.setData(
                candlesArr.map(([time, open, high, low, close]) => ({time: time / 1000, open, high, low, close}))
            ));
    }

    function streamCandles(symbol, interval) {
        candlesStream = new WebSocket(`${WEBSOCKET_ENDPOINT}/${symbol.toLowerCase()}@kline_${interval}`);
        candlesStream.onmessage = event => {
            const {t: time, o: open, c: close, h: high, l: low} = JSON.parse(event.data).k;
            candlestickSeries.update({time: time / 1000, open, close, high, low})
        };
    }

    function streamAggTrades(symbol) {
        aggTradesStream = new WebSocket(`${WEBSOCKET_ENDPOINT}/${symbol.toLowerCase()}@aggTrade`)
        aggTradesStream.onmessage = event => {
            const {m: isBuyerMaker, p: price, q: quantity} = JSON.parse(event.data);


            /*
             <div class="trade sell">
                    <div>10000.00</div>
                    <div>2</div>
                    <div>20000.00</div>
                </div>
                */
               const tradeElement = document.createElement('div');
               tradeElement.classList.add('trade', isBuyerMaker ? 'sell' : 'buy' );
               tradeElement.innerHTML = `
               <div>${price}</div>
               <div>${quantity}</div>
               <div>${(price * quantity).toFixed(2)}</div>
               `;
               tradesListElement.prepend(tradeElement);

               if (tradesListElement.children.length > 1000) {
                tradesListElement.children[tradesListElement.children.length - 1].remove();
               }
        };
    }