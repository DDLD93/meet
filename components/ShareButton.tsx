'use client';

import { useState, useCallback } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type ShareButtonProps = {
  url: string;
  title?: string;
  text?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
};

export function ShareButton({
  url,
  title,
  text,
  variant = 'outline',
  size = 'default',
  className = '',
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    // Try native share API first (mobile/desktop with support)
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Join this meeting',
          text: text || 'Join me in this meeting',
          url,
        });
        return;
      } catch (err) {
        // User cancelled or error - fall through to copy
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    }

    // Fallback to copy
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!', {
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    }
  }, [url, title, text]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!', {
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    }
  }, [url]);

  return (
    <div className="flex items-center gap-1.5">
      <Button
        onClick={handleShare}
        variant={variant}
        size={size}
        className={`group transition-all ${className}`}
      >
        <Share2 className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:rotate-12" />
        <span className="hidden sm:inline">Share</span>
      </Button>
      <Button
        onClick={handleCopy}
        variant="ghost"
        size={size}
        className={`h-9 w-9 p-0 transition-all hover:bg-white/10 ${className}`}
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-400 animate-in fade-in duration-200" />
        ) : (
          <Copy className="h-4 w-4 transition-transform hover:scale-110" />
        )}
      </Button>
    </div>
  );
}

