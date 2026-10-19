import React from 'react';
import { ExpenseCategory } from '../types';
import { Fuel, Utensils, Coffee, Wrench } from 'lucide-react';

interface CategoryIconProps {
  category: ExpenseCategory;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ 
  category, 
  className = '', 
  size = 20 
}) => {
  switch (category) {
    case 'fuel':
      return <Fuel size={size} className={className} />;
    case 'food':
      return <Utensils size={size} className={className} />;
    case 'coffee':
      return <Coffee size={size} className={className} />;
    case 'other':
    default:
      return <Wrench size={size} className={className} />;
  }
};
