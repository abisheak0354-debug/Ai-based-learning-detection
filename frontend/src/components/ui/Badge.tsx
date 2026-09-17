import { cn } from '../../utils/cn';

const colors = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
};

export const Badge = ({ severity }: { severity: string }) => (
  <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', colors[severity as keyof typeof colors])}>
    {severity}
  </span>
);