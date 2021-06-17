import { useCallback, useState } from 'react';
import { useMountedState } from './use-mounted-state';

export const useSafeState = <S>(initialValue: S | (() => S)) => {
  const isMounted = useMountedState();

  const [state, _setState] = useState(initialValue);

  const setState = useCallback<typeof _setState>((...args) => {
    if (isMounted()) {
      _setState(...args);
    }
  }, [isMounted]);

  const returnValue: [typeof state, typeof _setState] = [state, setState];

  return returnValue;
};
