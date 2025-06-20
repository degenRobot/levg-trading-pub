import { toast as reactToast } from 'react-toastify';

export function useToast() {
  const toast = ({
    title,
    description,
    variant = 'default',
  }: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }) => {
    const message = description ? `${title}\n${description}` : title;
    
    if (variant === 'destructive') {
      reactToast.error(message);
    } else {
      reactToast.success(message);
    }
  };

  return { toast };
}