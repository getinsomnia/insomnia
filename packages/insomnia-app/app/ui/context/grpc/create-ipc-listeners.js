// @flow
import { ipcRenderer } from 'electron';
import { GrpcResponseEventEnum } from '../../../common/grpc-events';
import grpcActions from './grpc-actions';
import type { GrpcDispatch } from './grpc-actions';

// TODO: Do we need to clear listeners or will they overwrite?

const listenForStart = (dispatch: GrpcDispatch) => {
  ipcRenderer.on(GrpcResponseEventEnum.start, (_, requestId) => {
    dispatch(grpcActions.start(requestId));
  });
};

const listenForStop = (dispatch: GrpcDispatch) => {
  ipcRenderer.on(GrpcResponseEventEnum.end, (_, requestId) => {
    dispatch(grpcActions.stop(requestId));
  });
};

const listenForData = (dispatch: GrpcDispatch) => {
  ipcRenderer.on(GrpcResponseEventEnum.data, (_, requestId, val) => {
    dispatch(grpcActions.responseMessage(requestId, val));
  });
};

const listenForError = (dispatch: GrpcDispatch) => {
  ipcRenderer.on(GrpcResponseEventEnum.error, (_, requestId, err) => {
    dispatch(grpcActions.error(requestId, err));
  });
};

export const createGrpcIpcListeners = (dispatch: GrpcDispatch): void => {
  listenForStart(dispatch);
  listenForStop(dispatch);
  listenForData(dispatch);
  listenForError(dispatch);
};
