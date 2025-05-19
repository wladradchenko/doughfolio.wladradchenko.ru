// src/hooks/useHistory.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

interface HistoryItem {
  date: string;
  data: any[];
  totalValue: number; // Добавим общую сумму
}

export const useHistory = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const loadHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem('cryptoDonutHistory');
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(parsed);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  interface HistoryItem {
    date: string;
    data: {
      name: string;
      value: number;
      percentage: number; // Добавили!
      color: string;
      image: string;
      symbol: string;
    }[];
    totalValue: number;
  }

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('cryptoDonutHistory');
      setHistory([]);
      return true;
    } catch (e) {
      console.error('Cleaning error:', e);
      return false;
    }
  };

  const addToHistory = async (newData: any[]) => {
    const totalValue = newData.reduce((sum, item) => sum + item.value, 0);
    try {
      const newItem = { 
        date: new Date().toLocaleString(),
        data: newData,
        totalValue,
      };
      const updatedHistory = [newItem, ...history];
      await AsyncStorage.setItem('cryptoDonutHistory', JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return { history, addToHistory, clearHistory };
};