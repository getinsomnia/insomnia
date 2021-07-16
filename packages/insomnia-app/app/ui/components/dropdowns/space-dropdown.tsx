import { Dropdown, DropdownDivider, DropdownItem, SvgIcon } from 'insomnia-components';
import React, { FC, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { getAppName } from '../../../common/constants';
import { strings } from '../../../common/strings';
import { BASE_SPACE_ID, Space } from '../../../models/space';
import { VCS } from '../../../sync/vcs/vcs';
import { useRemoteSpaces } from '../../hooks/space';
import { setActiveSpace } from '../../redux/modules/global';
import { createSpace } from '../../redux/modules/space';
import { selectActiveSpace, selectIsRemoteSpace, selectSpaces } from '../../redux/selectors';
import { showModal } from '../modals';
import SpaceSettingsModal from '../modals/space-settings-modal';

type SpaceSubset = Pick<Space, '_id' | 'name' | 'remoteId'>;

const baseSpace: SpaceSubset = {
  _id: BASE_SPACE_ID,
  name: getAppName(),
  remoteId: null,
};

const cog = <i className="fa fa-cog" />;
const plus = <SvgIcon icon="plus" />;
const spinner = <i className="fa fa-spin fa-refresh" />;
const home = <SvgIcon icon="home" />;
const remoteSpace = <SvgIcon icon="globe" />;
const localSpace = <SvgIcon icon="globe" />;

const Checkmark = styled(SvgIcon)({
  fill: 'var(--color-surprise)',
});

interface Props {
  vcs?: VCS;
}

const BoldDropdownItem = styled(DropdownItem)({
  fontWeight: 500,
});

const SpaceDropdownItem: FC<{ space: SpaceSubset }> = ({
  space: {
    _id: spaceId,
    name,
  },
}) => {
  console.log('rendering space', { spaceId, name });

  const dispatch = useDispatch();
  const setActive = useCallback((id: string) => dispatch(setActiveSpace(id)), [dispatch]);
  const isRemote = useSelector(selectIsRemoteSpace(spaceId));

  const activeSpace = useSelector(selectActiveSpace);
  const selectedSpace = activeSpace || baseSpace;
  return (
    <BoldDropdownItem
      key={spaceId}
      icon={spaceId === baseSpace._id ? home : isRemote ? remoteSpace : localSpace}
      right={spaceId === selectedSpace._id && <Checkmark icon='checkmark' />}
      value={spaceId}
      onClick={setActive}
    >
      {name}
    </BoldDropdownItem>
  );
};
SpaceDropdownItem.displayName = 'DropdownItem';

export const SpaceDropdown: FC<Props> = ({ vcs }) => {
  const { loading, refresh } = useRemoteSpaces(vcs);

  // get list of spaces (which doesn't include the base space)
  const spaces = useSelector(selectSpaces);

  // figure out which space is selected
  const activeSpace = useSelector(selectActiveSpace);
  const selectedSpace = activeSpace || baseSpace;
  const spaceHasSettings = selectedSpace !== baseSpace && selectedSpace.remoteId === null;

  // select a new space
  const dispatch = useDispatch();
  const createNew = useCallback(() => dispatch(createSpace()), [dispatch]);
  const showSettings = useCallback(() => showModal(SpaceSettingsModal), []);

  // dropdown button
  const button = useMemo(() => (
    <button type="button" className="row" title={selectedSpace.name}>
      {selectedSpace.name}
      <i className="fa fa-caret-down space-left" />
    </button>
  ), [selectedSpace]);

  console.log({ spaces });

  return (
    <Dropdown renderButton={button} onOpen={refresh}>
      <SpaceDropdownItem space={baseSpace} />

      <DropdownDivider>All spaces{' '}{loading && spinner}</DropdownDivider>

      {spaces.map(space => {
        console.log('spy', space);
        return (
          <SpaceDropdownItem key={space._id} space={space} />
        );
      })}

      {spaceHasSettings && <>
        <DropdownDivider />
        <DropdownItem icon={cog} onClick={showSettings}>
          {strings.space.singular} Settings
        </DropdownItem>
      </>}

      <DropdownDivider />
      <DropdownItem icon={plus} onClick={createNew}>
        Create or join a {strings.space.singular.toLowerCase()}
      </DropdownItem>
    </Dropdown>
  );
};
