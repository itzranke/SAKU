'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { sakuStore } from './store';

export default function SakuProviders({ children }: { children: React.ReactNode }) {
  return <Provider store={sakuStore}>{children}</Provider>;
}
