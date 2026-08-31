declare module 'react-katex' {
  import React from 'react';
  export const InlineMath: React.FC<{ math: string; renderError?: (error: Error) => React.ReactNode }>;
  export const BlockMath: React.FC<{ math: string; renderError?: (error: Error) => React.ReactNode }>;
}
