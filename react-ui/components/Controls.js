const { FormControlLabel } = MaterialUI
const { FormGroup } = MaterialUI
const { Switch } = MaterialUI

class Controls extends React.Component {
  toggle = (event, checked) => {
    chrome.runtime.sendMessage({msg:'changeSetting',change:['forwardingEnabled',checked]},()=>{})
  }
  render() {
    return (
      <div>
        <h3>Controls</h3>
        
        <FormGroup>
          <FormControlLabel
            control={
                <Switch
                    checked={this.props.forwardingEnabled}
                    onChange={this.toggle}
                    />
          }
          label="Enable Forwarding"
          />
        </FormGroup>
        
      </div>
    )
  }
}

export default Controls
