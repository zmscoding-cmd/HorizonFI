import React, { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer } from 'recharts';

export function SafeResponsiveContainer({ children, ...props }: any) {
  return (
    <ResponsiveContainer {...props}>
      {children}
    </ResponsiveContainer>
  );
}
