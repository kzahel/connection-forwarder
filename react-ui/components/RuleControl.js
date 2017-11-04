import React from 'react'
import { FormControlLabel, FormGroup } from 'material-ui/Form';
import Switch from 'material-ui/Switch';
import IconButton from 'material-ui/IconButton';
import DeleteIcon from 'material-ui-icons/Delete';

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
      <div className="ruleDiv">
        {this.props.rule.src_addr.address}:{this.props.rule.src_port} to 
        {' '}{this.props.rule.dst_addr.address}:{this.props.rule.dst_port}
        <FormGroup
          disabled={this.state.changingState}
          >
          <FormControlLabel
            control={
                <Switch
                    checked={! this.props.rule.disabled}
                    onChange={ this.handleEnable.bind(this) }
                    />
          }
          label="Enable Rule"
          />
          <IconButton aria-label="Delete" onClick={this.deleteRule}>
            <DeleteIcon />
          </IconButton>        
        </FormGroup>
      </div>
    )
  }
}

export default RuleControl
