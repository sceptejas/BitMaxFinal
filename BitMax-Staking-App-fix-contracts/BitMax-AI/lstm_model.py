# lstm_model.py
import numpy as np
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from sklearn.preprocessing import MinMaxScaler

def preprocess_data(data):
    prices = np.array([x[1] for x in data['prices']])
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_prices = scaler.fit_transform(prices.reshape(-1, 1))
    
    # Create sequences for LSTM
    X, y = [], []
    for i in range(60, len(scaled_prices)):
        X.append(scaled_prices[i-60:i, 0])
        y.append(scaled_prices[i, 0])
    X, y = np.array(X), np.array(y)
    X = np.reshape(X, (X.shape[0], X.shape[1], 1))
    
    return X, y, scaler

def build_lstm_model(input_shape):
    model = Sequential()
    model.add(LSTM(units=50, return_sequences=True, input_shape=input_shape))
    model.add(LSTM(units=50, return_sequences=False))
    model.add(Dense(units=25))
    model.add(Dense(units=1))
    model.compile(optimizer='adam', loss='mean_squared_error')
    return model

async def train_lstm(coin_id: str, fetch_historical_data):
    data = await fetch_historical_data(coin_id)
    X, y, scaler = preprocess_data(data)
    
    model = build_lstm_model((X.shape[1], 1))
    model.fit(X, y, batch_size=32, epochs=10)
    
    return model, scaler

def predict_yield(model, scaler, last_60_days):
    last_60_days_scaled = scaler.transform(last_60_days.reshape(-1, 1))
    X_test = np.array([last_60_days_scaled])
    X_test = np.reshape(X_test, (X_test.shape[0], X_test.shape[1], 1))
    predicted_price = model.predict(X_test)
    predicted_price = scaler.inverse_transform(predicted_price)
    return predicted_price[0][0]
