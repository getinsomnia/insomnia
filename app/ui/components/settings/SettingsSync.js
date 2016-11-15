import React, {PropTypes} from 'react';
import Link from '../base/Link';
import PromptButton from '../base/PromptButton';

const SettingsSync = ({
  loggedIn,
  firstName,
  handleExit,
  handleUpdateSetting,
  handleShowSignup,
  handleCancelAccount,
  handleLogout,
  handleReset,
}) => (
  <div className="pad">
    <h1>Cloud Sync and Backup</h1>
    <p>
      <Link href="https://insomnia.rest/plus">Insomnia Plus</Link> helps you <i>rest</i> easy by
      keeping your workspaces securely backed up and synced across all of your devices.
    </p>
    <p>
      Upgrade today to start enjoying
      {" "}
      <Link href="https://insomnia.rest/pricing/">all of the benefits</Link>, while also helping
      support my continuous effort of making Insomnia awesome! <i className="fa fa-smile-o txt-xl"/>
    </p>

    {loggedIn ? [
      <p key="1">
        Hi {firstName}! Thanks for signing up for Insomnia
        Plus.
      </p>,
      <p key="2" className="pad-top">
        <PromptButton
          className="btn btn--super-compact btn--outlined danger"
          onClick={async () => {
            handleExit();
            await handleCancelAccount();
          }}>
          Cancel Subscription
        </PromptButton>
        {" "}
        <PromptButton className="btn btn--super-compact btn--outlined warning"
                      onClick={handleReset}
                      confirmMessage="Delete all sync-related data?">
          Reset Remote Data
        </PromptButton>
        {" "}
        <PromptButton className="btn btn--super-compact btn--outlined"
                      onClick={async () => {
                        handleExit();
                        await handleLogout();
                      }}>
          Log Out
        </PromptButton>
      </p>
    ] : [
      <p key="2" className="pad-top text-center">
        <button className="btn txt-lg btn--outlined"
                onClick={() => {
                  handleExit();
                  handleShowSignup()
                }}>
          Upgrade to Plus
        </button>
      </p>,
      <p key="3" className="text-center italic">
        $5 per month or $50 per year
        <div className="txt-sm faint pad-top-sm">
          14-day trial (credit card required) cancel at any time
        </div>
      </p>
    ]}
  </div>
);

SettingsSync.propTypes = {
  loggedIn: PropTypes.bool.isRequired,
  firstName: PropTypes.string.isRequired,
  handleExit: PropTypes.func.isRequired,
  handleUpdateSetting: PropTypes.func.isRequired,
  handleShowSignup: PropTypes.func.isRequired,
  handleCancelAccount: PropTypes.func.isRequired,
  handleLogout: PropTypes.func.isRequired,
  handleReset: PropTypes.func.isRequired,
};

export default SettingsSync;

