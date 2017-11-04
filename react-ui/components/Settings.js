import React from 'react'
import { FormControlLabel, FormGroup } from 'material-ui/Form';
import Switch from 'material-ui/Switch';

class Settings extends React.Component {
  changeSetting = (k,v) => {
    chrome.runtime.sendMessage({msg:"changeSetting",change:[k,v]},()=>{})
  }
  render() {
    return (
      <div>
        <h3>Settings (Not yet functional)</h3>

        <FormGroup>
          <FormControlLabel
            control={
                <Switch
                    checked={this.props.settings.autostart}
                    onChange={(event, checked) => this.changeSetting("autostart",checked)}
                    />
          }
          label="Auto Start on Login"
          />
        </FormGroup>

        <FormGroup>
          <FormControlLabel
            control={
                <Switch
                    checked={this.props.settings.background}
                    onChange={(event, checked) => this.changeSetting("background",checked)}
                    />
          }
          label="Run in Background"
          />
        </FormGroup>

        <FormGroup>
          <FormControlLabel
            disabled={true}
            control={
                <Switch
                    checked={this.props.settings.ipv6}
                    onChange={(event, checked) => this.changeSetting("ipv6",checked)}
                    />
          }
          label="Enable IPV6 (Coming soon)"
          />
        </FormGroup>

        
      </div>
    )
  }
}

export default Settings
