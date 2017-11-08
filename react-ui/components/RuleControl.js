import React from 'react'
import { FormControlLabel, FormGroup } from 'material-ui/Form';
import Switch from 'material-ui/Switch';
import IconButton from 'material-ui/IconButton';
import DeleteIcon from 'material-ui-icons/Delete';
import Paper from 'material-ui/Paper';
import Tooltip from 'material-ui/Tooltip';

class RuleControl extends React.Component {
  state = { changingState: false }
  // grab state from background page, which should send events
  
  deleteRule = async (event) => {
    var msg = {msg:'deleteRule',rule:this.props.rule}
    let resp = await chromise.runtime.sendMessage(msg)
    console.log(msg,'resp',resp)
  }
  handleEnable = async (event, checked) => {
    this.setState({disabled: ! checked})
    var msg = checked ? 'enableRule' : 'disableRule'
    let resp = await chromise.runtime.sendMessage({msg:msg,rule:this.props.rule})
    console.log(msg,'resp',resp)
  }
  render() {
    return (
      <Paper>
        <div className="ruleContainer">
          <div className="ruleInfoText">
        {this.props.rule.protocol}{' '}
        {this.props.rule.src_addr.address}:{this.props.rule.src_port} {String.fromCharCode(8674)}
        {' '}{this.props.rule.dst_addr.address}:{this.props.rule.dst_port}
          </div>

          <FormControlLabel
            disabled={this.props.disabled}
            control={
                <Switch
                    checked={! this.props.rule.disabled}
                    onChange={ this.handleEnable.bind(this) }
                    />
          }
          label="Enable Rule"
                />

          <Tooltip title="Remove this rule" 
                   enterDelay="500"
                   >
            <IconButton aria-label="Delete" onClick={this.deleteRule}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>

      </div>
      </Paper>

    )
  }
}

export default RuleControl
