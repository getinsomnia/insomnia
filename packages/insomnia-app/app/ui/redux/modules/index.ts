import { bindActionCreators, combineReducers } from 'redux';
import { allDocs, addChanges, initializeWith, reducer as entitiesReducer } from './entities';
import configureStore from '../create';
import { reducer as globalReducer, newCommand, loginStateChange, initActiveSpace, initActiveActivity, initActiveWorkspace } from './global';
import { database as db } from '../../../common/database';
import { API_BASE_URL, getClientString } from '../../../common/constants';
import { isLoggedIn, onLoginLogout } from '../../../account/session';
import { setup, onCommand } from '../../../account/fetch';

// TODO there's a circular dependency between this file and /redux/create
export async function init() {
  const store = configureStore();

  // Do things that must happen before initial render
  const bound = bindActionCreators({
    addChanges,
    initializeWith,
    newCommand,
    loginStateChange,
  }, store.dispatch);

  // Link DB changes to entities reducer/actions
  const docs = await allDocs();
  bound.initializeWith(docs);
  db.onChange(bound.addChanges);

  // Initialize login state
  bound.loginStateChange(isLoggedIn());
  onLoginLogout(loggedIn => {
    bound.loginStateChange(loggedIn);
  });

  // Bind to fetch commands
  setup(getClientString(), API_BASE_URL);
  onCommand(bound.newCommand);

  store.dispatch(initActiveSpace());
  store.dispatch(initActiveWorkspace());
  // @ts-expect-error -- TSCONVERSION need to merge in Redux-Thunk types to root
  store.dispatch(initActiveActivity());

  return store;
}

export const reducer = combineReducers({
  entities: entitiesReducer,
  global: globalReducer,
});
