/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface IcsLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  className?: string;
  theme?: 'dark' | 'light';
}

export function IcsLogo({ variant = 'full', className = '', theme = 'light' }: IcsLogoProps) {
  // Fingerprint vector lines reconstructed from the original ICS logo
  const FingerprintIcon = () => (
    <svg 
      viewBox="0 0 200 170" 
      className={`${variant === 'icon' ? 'w-16 h-16' : variant === 'compact' ? 'w-10 h-10' : 'w-28 h-24'} shrink-0`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Green Loops (Top) */}
      <path 
        d="M68 64C68 36 90 26 110 26C122 26 132 30 138 38C142 43 144 50 144 56C144 68 138 74 133 80C130 84 126 88 126 95" 
        stroke="#15803d" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M78 52C75 42 86 36 98 36C108 36 118 39 122 46C125 51 126 56 126 62C126 70 119 78 114 84" 
        stroke="#15803d" 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Middle Yellow Loops */}
      <path 
        d="M50 78C46 64 54 48 72 44C84 41 98 44 105 52C111 58 114 66 114 74C114 84 106 91 101 98C97 104 94 110 94 116" 
        stroke="#eab308" 
        strokeWidth="6.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M62 72C59 62 66 54 78 52C86 51 96 54 100 60C104 65 106 72 104 78C102 85 96 90 92 96" 
        stroke="#eab308" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M100 120C100 126 98 131 94 136C87 143 78 144 70 142" 
        stroke="#eab308" 
        strokeWidth="5" 
        strokeLinecap="round" 
      />
      
      {/* Inner Red Loops (Whorl - Left & Bottom-Left) */}
      <path 
        d="M52 108C50 102 54 94 62 88C72 82 86 86 90 94C94 102 91 112 85 118C80 123 74 128 74 134" 
        stroke="#dc2626" 
        strokeWidth="6.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M59 100C58 97 60 92 65 89C71 85 80 88 82 94C84 100 81 107 76 111C72 115 68 118 68 123" 
        stroke="#dc2626" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M44 94C42 86 48 76 58 72C68 68 80 72 84 80" 
        stroke="#dc2626" 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Blue Clearance Loops (Validator - Right & Bottom-Right) */}
      <path 
        d="M110 102L124 116L164 74" 
        stroke="#1d4ed8" 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M124 130L135 141L175 99" 
        stroke="#1d4ed8" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M120 78C126 78 132 82 136 88C138 91 138 95 138 98" 
        stroke="#1e3a8a" 
        strokeWidth="5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );

  if (variant === 'icon') {
    return <FingerprintIcon />;
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`} id="ics-logo-compact">
        <FingerprintIcon />
        <div className="text-left leading-tight">
          <span className={`text-base font-black tracking-wider ${theme === 'dark' ? 'text-white' : 'text-blue-900'} font-sans`}>
            ICS
          </span>
          <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider font-mono">ETHIOPIA</p>
        </div>
      </div>
    );
  }

  // Full Version - Used in Login and Main splash screens
  return (
    <div className={`flex flex-col items-center justify-center text-center p-2 ${className}`} id="ics-logo-full">
      <FingerprintIcon />
      
      <h1 className={`text-5xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-blue-900'} mt-1`}>
        ICS
      </h1>
      
      <div className="mt-2 space-y-0.5">
        <p className={`text-xs font-bold leading-normal tracking-wide ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'} font-sans`}>
          የኢሚግሬሽንና ዜግነት አገልግሎት
        </p>
        <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase font-sans">
          IMMIGRATION AND CITIZENSHIP SERVICE
        </p>
      </div>
    </div>
  );
}
