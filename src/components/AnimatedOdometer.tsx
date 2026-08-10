import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AnimatedOdometerProps {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  digitClassName?: string;
}

interface DigitColumnProps {
  key?: string | number;
  digit: number;
  place: number;
  isIncrease: boolean;
  digitClassName?: string;
  isInitialRender: boolean;
}

function SingleDigitReel({ digit, isIncrease, digitClassName, isInitialRender }: DigitColumnProps) {
  // On initial load of app, show target digit immediately.
  // On subsequent new column mount during increase, start from 0 so it rolls up to digit.
  const [reelIndex, setReelIndex] = useState<number>(() => {
    if (isInitialRender) return digit;
    return isIncrease ? 0 : digit;
  });

  const prevDigitRef = useRef<number>(isInitialRender ? digit : (isIncrease ? 0 : digit));

  useEffect(() => {
    const prevDigit = prevDigitRef.current;
    if (digit === prevDigit && reelIndex === digit) return;

    if (isIncrease) {
      // Calculate upward rolling step
      const diff = (digit - prevDigit + 10) % 10;
      const step = (diff === 0 && digit !== prevDigit) ? 10 : diff;
      setReelIndex((prev) => prev + step);
    } else {
      // Balance decreased: roll directly/backwards
      const diff = digit - prevDigit;
      setReelIndex((prev) => prev + diff);
    }

    prevDigitRef.current = digit;
  }, [digit, isIncrease]);

  // Make sure we have enough items in the strip to reach reelIndex
  const stripLength = Math.max(reelIndex + 10, 30);
  const digitsArray = Array.from({ length: stripLength }, (_, i) => i % 10);

  return (
    <span className={`inline-flex overflow-hidden h-[1em] relative leading-none align-baseline ${digitClassName || ''}`}>
      <motion.span
        initial={false}
        animate={{ y: `-${reelIndex}em` }}
        transition={{
          duration: 0.65,
          ease: [0.16, 1, 0.3, 1] // Fast, smooth slot-machine roll (~650ms)
        }}
        className="flex flex-col items-center select-none"
      >
        {digitsArray.map((d, i) => (
          <span key={i} className="h-[1em] flex items-center justify-center leading-none">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

export function AnimatedOdometer({
  value,
  suffix,
  prefix,
  className = '',
  digitClassName = ''
}: AnimatedOdometerProps) {
  const prevValueRef = useRef<number>(value);
  const [isIncrease, setIsIncrease] = useState<boolean>(true);
  const isInitialRenderRef = useRef<boolean>(true);

  useEffect(() => {
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      return;
    }
    if (value !== prevValueRef.current) {
      setIsIncrease(value >= prevValueRef.current);
      prevValueRef.current = value;
    }
  }, [value]);

  // Format value into comma-separated string e.g. "1,250"
  const formattedStr = Math.max(0, Math.floor(value)).toLocaleString();

  // Parse characters into structured places from right to left
  const rawChars = formattedStr.split('');
  let digitPlaceCounter = 0;

  // Process right-to-left to anchor digits by place (ones, tens, hundreds, etc.)
  const itemsFromRight: Array<{ key: string; char: string; isDigit: boolean; digitVal: number; place: number }> = [];

  for (let i = rawChars.length - 1; i >= 0; i--) {
    const ch = rawChars[i];
    const isDigit = /\d/.test(ch);
    if (isDigit) {
      const place = digitPlaceCounter++;
      itemsFromRight.push({
        key: `d_${place}`,
        char: ch,
        isDigit: true,
        digitVal: parseInt(ch, 10),
        place
      });
    } else {
      itemsFromRight.push({
        key: `s_${digitPlaceCounter}_${ch}`,
        char: ch,
        isDigit: false,
        digitVal: 0,
        place: digitPlaceCounter
      });
    }
  }

  // Reverse back to normal left-to-right display order
  const displayItems = itemsFromRight.reverse();

  return (
    <span className={`inline-flex items-baseline font-inherit leading-none tracking-tight ${className}`}>
      {prefix && <span>{prefix}</span>}
      <AnimatePresence mode="popLayout">
        {displayItems.map((item) => {
          if (!item.isDigit) {
            return (
              <span key={item.key} className="inline-block leading-none">
                {item.char}
              </span>
            );
          }
          return (
            <SingleDigitReel
              key={item.key}
              digit={item.digitVal}
              place={item.place}
              isIncrease={isIncrease}
              digitClassName={digitClassName}
              isInitialRender={isInitialRenderRef.current}
            />
          );
        })}
      </AnimatePresence>
      {suffix && <span className="ml-1">{suffix}</span>}
    </span>
  );
}

export default AnimatedOdometer;
