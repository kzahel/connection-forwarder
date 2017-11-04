import React from 'react'

import Paper from 'material-ui/Paper'
import Button from 'material-ui/Button'
import Switch from 'material-ui/Switch'
import Checkbox from 'material-ui/Checkbox'
import FormGroup from 'material-ui/Form/FormGroup'
import TextField from 'material-ui/TextField'

import MyAppBar from './MyAppBar'
import SimpleCard from './SimpleCard'
import SwitchLabels from './SwitchLabels'
import InputFirewallRule from './InputFirewallRule'
import RuleControl from './RuleControl'
import Controls from './Controls'
import Settings from './Settings'

import 'typeface-roboto';


function validatePort(port) {
  let pval = parseInt(port)
  if (pval === port &&
      pval >= 1024 && pval <= 65535) {
    return true
  } else {
    console.assert('port invalid',port)
  }
}

class MyApp extends React.Component {
  constructor(props) {
    super(props)
    window.app = this
    console.log('setup storage change listener')
    chrome.storage.onChanged.addListener( this.onStorageChanged )
    this.state = {
      ready: false,
      addingRule: false
    }
    this.setup()
  }
  onStorageChanged = (d,area) => {
    console.log('onStorageChanged',d,area)
    let dflat = {}
    for (let k in d) {
      dflat[k] = d[k].newValue
    }
    if (area == 'local') {
      this.setState(dflat)
    }
  }
  startAddRule = e => {
    this.setState({addingRule: true})
  }
  async setup() {
    let [ ifaces, storage ] =
        await Promise.all([chromise.system.network.getNetworkInterfaces(),
                           chromise.storage.local.get(['rules','settings'])])
    ifaces = ifaces.filter( i=>i.prefixLength === 24 )
    storage.settings = storage.settings || {}
    storage.rules = storage.rules || []
    updateDefaultSettings(storage.settings)
    // duplicated "default" logic (see "defaults") in runtime.js
    this.setState({rules:storage.rules,
                   settings:storage.settings,
                   ifaces:ifaces,
                   ready:true})
  }
	render() {
    if (! this.state.ready) {
      return <div>Loading</div>
    }
    let rules = this.state.rules.map( rule => (
      <RuleControl disabled={!this.state.settings.forwardingEnabled} key={rule.id} rule={rule} />
    ))
		return (
			<div>
				<MyAppBar></MyAppBar>
        <div className="appMain">
          <Controls forwardingEnabled={this.state.settings.forwardingEnabled}/>
          {rules}
          { this.state.addingRule ?
				    <InputFirewallRule ifaces={this.state.ifaces} /> :
            <Button raised onClick={this.startAddRule}>New Forwarding Rule</Button> }
            <Settings settings={this.state.settings} />
        </div>
			</div>
		)
	}
}
export default MyApp
