import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { SakuAppDispatch, SakuRootState } from './index';

export const useSakuDispatch = () => useDispatch<SakuAppDispatch>();
export const useSakuSelector: TypedUseSelectorHook<SakuRootState> = useSelector;
