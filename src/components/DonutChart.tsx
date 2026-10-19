import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { ExpenseCategory, Language } from '../types';
import { formatCurrency } from '../utils/formatters';
import { translations, getCategoryColor } from '../i18n/translations';
import { CategoryIcon } from './CategoryIcon';

export interface DonutSegment {
  category: ExpenseCategory;
  amount: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  totalAmount: number;
  lang: Language;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, totalAmount, lang }) => {
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | null>(null);
  const t = translations[lang];

  // Filter out zero amount segments for the pie chart slices
  const activeSegments = data
    .filter((d) => d.amount > 0)
    .map((d) => ({
      ...d,
      name: t.categories[d.category],
    }));

  // If no expenses this month, render a clean empty state
  if (totalAmount === 0 || activeSegments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-100 shadow-xs">
        <div className="w-40 h-40 rounded-full border-[18px] border-slate-100 flex items-center justify-center">
          <span className="text-xs font-bold text-slate-400 tabular-nums">€0.00</span>
        </div>
        <p className="mt-4 text-xs font-medium text-slate-500">
          {t.noExpensesThisMonth}
        </p>
      </div>
    );
  }

  const selectedData = activeCategory
    ? activeSegments.find((s) => s.category === activeCategory)
    : null;

  return (
    <div className="flex flex-col items-center bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
      <div className="relative w-full h-60 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={activeSegments}
              dataKey="amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={96}
              paddingAngle={3}
              cornerRadius={6}
              stroke="none"
              isAnimationActive={true}
              animationDuration={450}
              onClick={(entry: DonutSegment) => {
                if (entry && entry.category) {
                  setActiveCategory((prev) =>
                    prev === entry.category ? null : entry.category
                  );
                }
              }}
              onMouseEnter={(entry: DonutSegment) => {
                if (entry && entry.category) {
                  setActiveCategory(entry.category);
                }
              }}
              onMouseLeave={() => {
                setActiveCategory(null);
              }}
            >
              {activeSegments.map((entry) => {
                const isSelected = activeCategory === entry.category;
                const isDimmed = activeCategory !== null && !isSelected;
                return (
                  <Cell
                    key={`cell-${entry.category}`}
                    fill={entry.color}
                    fillOpacity={isDimmed ? 0.45 : 1}
                    className="cursor-pointer transition-opacity duration-200 outline-hidden"
                  />
                );
              })}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0].payload as DonutSegment & { name: string };
                return (
                  <div className="bg-slate-900/95 text-white px-3 py-2 rounded-xl shadow-lg border border-white/10 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2 tabular-nums">
                      <span className="font-extrabold text-sm">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-emerald-300 font-semibold text-[11px]">
                        ({item.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Hole Dynamic Summary Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
          {selectedData ? (
            <div className="transition-all duration-200 animate-fadeIn">
              <span className="text-[11px] font-bold text-slate-600 tracking-wide block">
                {t.categories[selectedData.category]}
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                {formatCurrency(selectedData.amount)}
              </p>
              <span className="text-xs font-bold text-emerald-700 tabular-nums">
                {selectedData.percentage.toFixed(1)}%
              </span>
            </div>
          ) : (
            <div className="transition-all duration-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                {t.totalDaysLabel}
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 tabular-nums mt-0.5">
                {formatCurrency(totalAmount)}
              </p>
              <span className="text-[10px] font-semibold text-emerald-700">
                100%
              </span>
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 mt-1">
        {t.tapToInspect}
      </p>

      {/* Interactive Category Breakdown Grid */}
      <div className="grid grid-cols-2 gap-2.5 w-full mt-4 pt-3.5 border-t border-slate-100">
        {data.map((item) => {
          const colors = getCategoryColor(item.category);
          const isSelected = activeCategory === item.category;

          return (
            <button
              key={item.category}
              type="button"
              onClick={() =>
                setActiveCategory(activeCategory === item.category ? null : item.category)
              }
              className={`flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-emerald-50/80 border-emerald-500/40 shadow-xs'
                  : 'bg-slate-50/80 border-slate-100 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 mr-1">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}
                >
                  <CategoryIcon category={item.category} size={14} />
                </span>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 truncate">
                    {t.categories[item.category]}
                  </span>
                  <span className="block text-[10px] font-semibold text-slate-500 tabular-nums">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="block text-xs font-extrabold text-slate-900 tabular-nums">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
