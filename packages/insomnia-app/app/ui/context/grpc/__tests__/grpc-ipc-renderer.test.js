// @flow

import { ipcRenderer } from 'electron';
import { GrpcRequestEventEnum, GrpcResponseEventEnum } from '../../../../common/grpc-events';
import { grpcStatusObjectSchema } from '../__schemas__';
import { createBuilder } from '@develohpanda/fluent-builder';
import { grpcIpcRenderer, sendGrpcIpcMultiple, useGrpcIpc } from '../grpc-ipc-renderer';
import { grpcActions } from '../grpc-actions';
import { renderHook } from '@testing-library/react-hooks';

jest.mock('../grpc-actions', () => ({
  grpcActions: {
    start: jest.fn(),
    stop: jest.fn(),
    responseMessage: jest.fn(),
    error: jest.fn(),
    status: jest.fn(),
  },
}));

describe('init', () => {
  const e = {};
  const id = 'abc';
  const dispatch = jest.fn();

  beforeEach(() => {
    grpcIpcRenderer.init(dispatch);
  });

  it.each(Object.values(GrpcResponseEventEnum))('should add listener for channel: %s', channel => {
    expect(ipcRenderer.on).toHaveBeenCalledWith(channel, expect.anything());
  });

  it('should attach listener for start', () => {
    const [channel, listener] = ipcRenderer.on.mock.calls[0];

    expect(channel).toBe(GrpcResponseEventEnum.start);

    // Execute the callback, and make sure the correct grpc action is called
    listener(e, id);
    expect(grpcActions.start).toHaveBeenCalledWith(id);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should attach listener for end', () => {
    const [channel, listener] = ipcRenderer.on.mock.calls[1];

    expect(channel).toBe(GrpcResponseEventEnum.end);

    // Execute the callback, and make sure the correct grpc action is called
    listener(e, id);
    expect(grpcActions.stop).toHaveBeenCalledWith(id);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should attach listener for data', () => {
    const [channel, listener] = ipcRenderer.on.mock.calls[2];
    const val = { a: true };

    expect(channel).toBe(GrpcResponseEventEnum.data);

    // Execute the callback, and make sure the correct grpc action is called
    listener(e, id, val);
    expect(grpcActions.responseMessage).toHaveBeenCalledWith(id, val);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should attach listener for error', () => {
    const [channel, listener] = ipcRenderer.on.mock.calls[3];
    const err = new Error('error');

    expect(channel).toBe(GrpcResponseEventEnum.error);

    // Execute the callback, and make sure the correct grpc action is called
    listener(e, id, err);
    expect(grpcActions.error).toHaveBeenCalledWith(id, err);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('should attach listener for status', () => {
    const [channel, listener] = ipcRenderer.on.mock.calls[4];
    const status = createBuilder(grpcStatusObjectSchema).build();

    expect(channel).toBe(GrpcResponseEventEnum.status);

    // Execute the callback, and make sure the correct grpc action is called
    listener(e, id, status);
    expect(grpcActions.status).toHaveBeenCalledWith(id, status);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});

describe('destroy', () => {
  it.each(Object.values(GrpcResponseEventEnum))(
    'should remove listeners for channel: %s',
    channel => {
      grpcIpcRenderer.destroy();
      expect(ipcRenderer.removeAllListeners).toHaveBeenCalledWith(channel);
    },
  );
});

describe('useGrpcIpc', () => {
  const channel = GrpcRequestEventEnum.cancel;

  it('should send request id on channel', () => {
    const requestId = 'r1';

    const { result } = renderHook(() => useGrpcIpc(requestId));

    result.current(channel);

    expect(ipcRenderer.send).toHaveBeenCalledTimes(1);
    expect(ipcRenderer.send).toHaveBeenCalledWith(channel, requestId);
  });

  it.each([undefined, null, ''])('should not send if request id is %o', rId => {
    const { result } = renderHook(() => useGrpcIpc(rId));
    result.current(channel);

    expect(ipcRenderer.send).not.toHaveBeenCalled();
  });

  it('should update hook if request id changes', () => {
    const { result, rerender } = renderHook(id => useGrpcIpc(id));
    result.current(channel);

    expect(ipcRenderer.send).not.toHaveBeenCalled();

    const r1 = 'r1';
    rerender(r1);
    result.current(channel);

    expect(ipcRenderer.send).toHaveBeenCalledTimes(1);
    expect(ipcRenderer.send).toHaveBeenLastCalledWith(channel, r1);

    const r2 = 'r2';
    rerender(r2);
    result.current(channel);

    expect(ipcRenderer.send).toHaveBeenCalledTimes(2);
    expect(ipcRenderer.send).toHaveBeenLastCalledWith(channel, r2);
  });
});

describe('sendGrpcIpcMultiple', () => {
  const channel = GrpcRequestEventEnum.cancelMultiple;

  it('should send requestIds on channel', () => {
    const requestIds = ['abc', '123'];
    sendGrpcIpcMultiple(channel, requestIds);

    expect(ipcRenderer.send).toHaveBeenCalledTimes(1);
    expect(ipcRenderer.send).toHaveBeenCalledWith(channel, requestIds);
  });

  it('should not send on channel when request ids is empty', () => {
    sendGrpcIpcMultiple(channel, []);

    expect(ipcRenderer.send).not.toHaveBeenCalled();
  });

  it('should not send on channel when request ids is undefined', () => {
    sendGrpcIpcMultiple(channel, undefined);
    sendGrpcIpcMultiple(channel, null);
    sendGrpcIpcMultiple(channel);

    expect(ipcRenderer.send).not.toHaveBeenCalled();
  });
});
