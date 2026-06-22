"use client";

import React from "react";

type BarbellProgressProps = {
  current: number;
  max: number;
  label?: string;
  showLabel?: boolean;
  animated?: boolean;
};

export function BarbellProgress({
  current,
  max,
  label,
  showLabel = true,
  animated = true,
}: BarbellProgressProps) {
  const percentage = Math.min(100, (current / max) * 100);

  return (
    <div className="w-full">
      {showLabel && label && (
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {label}
          </span>
          <span className="font-data text-sm font-semibold text-gym-amber">
            {current.toLocaleString()} / {max.toLocaleString()}
          </span>
        </div>
      )}

      {/* Barbell bar container */}
      <div className="relative h-8 rounded-sm bg-gray-200 dark:bg-gray-800 overflow-hidden border border-gray-300 dark:border-gray-700">
        {/* Loading plates effect */}
        <div
          className={`h-full bg-gradient-to-r from-gym-amber to-orange-600 flex items-center justify-between px-2 ${
            animated ? "transition-all duration-500 ease-out" : ""
          }`}
          style={{ width: `${percentage}%` }}
        >
          {/* Barbell plates visualization */}
          {percentage > 5 && (
            <div className="flex gap-0.5 h-full items-center">
              {/* Left plate (red) */}
              <div className="w-1.5 h-6 bg-red-700 rounded-sm opacity-90"></div>
              {/* Bar (steel) */}
              <div className="flex-1 h-2.5 bg-white/80 rounded-full mx-0.5"></div>
              {/* Right plate (red) */}
              <div className="w-1.5 h-6 bg-red-700 rounded-sm opacity-90"></div>
            </div>
          )}
        </div>

        {/* Loading indicator line at end */}
        {percentage < 100 && (
          <div className="absolute right-0 top-0 h-full w-0.5 bg-gradient-to-b from-amber-400 to-gym-amber animate-pulse"></div>
        )}
      </div>

      {/* Percentage text */}
      <div className="mt-1 text-right text-xs text-gray-500 dark:text-gray-500">
        {Math.round(percentage)}%
      </div>
    </div>
  );
}
