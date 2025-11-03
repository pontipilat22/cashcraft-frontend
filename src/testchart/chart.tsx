'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';

interface DataPoint {
  date: Date;
  value: number;
  label: string;
}

interface ChartProps {
  className?: string;
}

const Chart: React.FC<ChartProps> = ({ className = '' }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1M');
  const [isAnimated, setIsAnimated] = useState(false);

  // Генерация случайных данных для разных периодов
  const generateData = (period: string): DataPoint[] => {
    const baseValue = 10000;
    const volatility = period === '0M' ? 50 : period === '1W' ? 100 : period === '1M' ? 200 : period === '3M' ? 500 : period === '1Y' ? 1000 : 2000;
    
    let points = 0;
    switch(period) {
      case '0M': points = 30; break; // Последний месяц - по дням
      case '1W': points = 7; break;   // Последняя неделя - по дням
      case '1M': points = 30; break;  // Месяц - по дням
      case '3M': points = 90; break;  // 3 месяца - по дням
      case '1Y': points = 52; break;  // Год - по неделям
      case '4Y': points = 48; break;  // 4 года - по месяцам
      default: points = 30;
    }

    const data: DataPoint[] = [];
    const now = new Date();
    
    for (let i = 0; i < points; i++) {
      const date = new Date(now);
      
      // Вычисляем дату в зависимости от периода
      switch(period) {
        case '0M':
        case '1W':
        case '1M':
        case '3M':
          date.setDate(date.getDate() - (points - i - 1));
          break;
        case '1Y':
          date.setDate(date.getDate() - (points - i - 1) * 7);
          break;
        case '4Y':
          date.setMonth(date.getMonth() - (points - i - 1));
          break;
      }

      // Генерируем значение с трендом вверх и случайными колебаниями
      const trend = (i / points) * 2000; // Общий тренд вверх
      const randomWalk = Math.sin(i * 0.3) * volatility + Math.random() * volatility - volatility / 2;
      const value = baseValue + trend + randomWalk;

      data.push({
        date,
        value: Math.max(0, Math.round(value)),
        label: date.toLocaleDateString()
      });
    }

    // Последняя точка всегда 11,950 как на картинке
    if (data.length > 0) {
      data[data.length - 1].value = 11950;
    }

    return data;
  };

  const data = useMemo(() => generateData(selectedPeriod), [selectedPeriod]);

  // Размеры графика
  const width = 350;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 20, left: 20 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Вычисление масштаба
  const xScale = (index: number) => {
    return padding.left + (index / (data.length - 1)) * graphWidth;
  };

  const yMin = Math.min(...data.map(d => d.value)) * 0.95;
  const yMax = Math.max(...data.map(d => d.value)) * 1.05;

  const yScale = (value: number) => {
    return padding.top + graphHeight - ((value - yMin) / (yMax - yMin)) * graphHeight;
  };

  // Создание пути для линии
  const linePath = data
    .map((point, index) => {
      const x = xScale(index);
      const y = yScale(point.value);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Создание области под графиком для градиента
  const areaPath = `${linePath} L ${xScale(data.length - 1)} ${height - padding.bottom} L ${xScale(0)} ${height - padding.bottom} Z`;

  // Обработка движения мыши
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Найти ближайшую точку данных
    const index = Math.round(((x - padding.left) / graphWidth) * (data.length - 1));
    
    if (index >= 0 && index < data.length) {
      const point = data[index];
      setHoveredValue(point.value);
      setHoveredPoint({
        x: xScale(index),
        y: yScale(point.value)
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredValue(null);
    setHoveredPoint(null);
  };

  // Форматирование суммы
  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Анимация при монтировании
  useEffect(() => {
    setIsAnimated(false);
    const timer = setTimeout(() => setIsAnimated(true), 50);
    return () => clearTimeout(timer);
  }, [selectedPeriod]);

  const periods = ['0M', '1W', '1M', '3M', '1Y', '4Y'];

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      {/* Заголовок и сумма */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total Balance</p>
        <h2 className="text-4xl font-bold text-blue-500">
          {formatValue(hoveredValue || data[data.length - 1]?.value || 0)}
        </h2>
      </div>

      {/* График */}
      <div className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Градиент для области под графиком */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Область под графиком */}
          <path
            d={areaPath}
            fill="url(#areaGradient)"
            className={`transition-opacity duration-1000 ${isAnimated ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Линия графика */}
          <path
            d={linePath}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-all duration-1000 ${isAnimated ? 'opacity-100' : 'opacity-0'}`}
            style={{
              strokeDasharray: isAnimated ? 0 : 1000,
              strokeDashoffset: isAnimated ? 0 : 1000,
            }}
          />

          {/* Точки на графике */}
          {data.map((point, index) => {
            const x = xScale(index);
            const y = yScale(point.value);
            const isLast = index === data.length - 1;
            const isHovered = hoveredPoint && Math.abs(hoveredPoint.x - x) < 5;

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={isLast || isHovered ? 5 : 0}
                fill="#3B82F6"
                stroke="white"
                strokeWidth="2"
                className={`transition-all duration-200 ${
                  isAnimated ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  transitionDelay: `${index * 20}ms`
                }}
              />
            );
          })}

          {/* Индикатор при наведении */}
          {hoveredPoint && (
            <>
              {/* Вертикальная линия */}
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={height - padding.bottom}
                stroke="#3B82F6"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />
              {/* Точка на линии */}
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="6"
                fill="#3B82F6"
                stroke="white"
                strokeWidth="3"
              />
            </>
          )}
        </svg>
      </div>

      {/* Кнопки периодов */}
      <div className="flex justify-between mt-6 px-2">
        {periods.map(period => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
              selectedPeriod === period
                ? 'bg-blue-500 text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {period}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Chart;
