import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200 p-6', className)}>
    {children}
  </div>
);