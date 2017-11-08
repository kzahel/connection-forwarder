import React from 'react'
import { FormControlLabel, FormGroup } from 'material-ui/Form';
import Switch from 'material-ui/Switch';
import Tooltip from 'material-ui/Tooltip';

class Settings extends React.Component {
  changeSetting = (k,v) => {
    chrome.runtime.sendMessage({msg:"changeSetting",change:[k,v]},()=>{})
  }
  render() {
    return (
      <div className="settingsContainer">
        <h3>Settings</h3>

        <FormGroup>
          <Tooltip title="Start the app when you sign in to your computer." 
                   enterDelay="500"
                   >
          <FormControlLabel
            control={
                <Switch
                    checked={this.props.settings.autostart}
                    onChange={(event, checked) => this.changeSetting("autostart",checked)}
                    />
          }
          label="Auto Start on Login"
          />
          </Tooltip>
        </FormGroup>

        <FormGroup>
          <Tooltip title="Continue forwarding connections when this window is closed" 
                   enterDelay="500"
                   >
          <FormControlLabel
            control={
                <Switch
                    checked={this.props.settings.background}
                    onChange={(event, checked) => this.changeSetting("background",checked)}
                    />
          }
          label="Run in Background"
          />
          </Tooltip>
        </FormGroup>

        <FormGroup>
          <Tooltip title="Show IPV6 Addresses"
                   enterDelay="500"
                   >
          <FormControlLabel

            control={
                <Switch
                    checked={this.props.settings.ipv6}
                    onChange={(event, checked) => this.changeSetting("ipv6",checked)}
                    />
          }
          label="Show IPV6 Addresses"
          />
          </Tooltip>
        </FormGroup>

        
      </div>
    )
  }
}

export default Settings
