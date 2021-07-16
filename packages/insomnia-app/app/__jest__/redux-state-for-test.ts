import { ACTIVITY_DEBUG } from '../common/constants';
import { BASE_SPACE_ID } from '../models/space';
import { RootState } from '../ui/redux/modules';
import * as entities from '../ui/redux/modules/entities';

const reduxStateForTest = async (activeWorkspaceId: string | null = null): Promise<RootState> => ({
  entities: entities.reducer(entities.initialEntitiesState, entities.initializeWith(await entities.allDocs())),
  global: {
    activeWorkspaceId,
    activeActivity: ACTIVITY_DEBUG,
    activeSpaceId: BASE_SPACE_ID,
    isLoading: false,
    isLoggedIn: false,
    loadingRequestIds: {},
  },
});

export default reduxStateForTest;
