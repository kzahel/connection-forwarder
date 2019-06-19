const { Paper } = MaterialUI
const { Button } = MaterialUI
const { Switch } = MaterialUI
const { Checkbox } = MaterialUI
const { FormGroup } = MaterialUI
const { TextField } = MaterialUI

import MyAppBar from './MyAppBar.js'
import SimpleCard from './SimpleCard.js'
import SwitchLabels from './SwitchLabels.js'
import InputFirewallRule from './InputFirewallRule.js'
import RuleControl from './RuleControl.js'
import Controls from './Controls.js'
import Settings from './Settings.js'


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
    // remove in destructor
    this.state = {
      ready: false,
      addingRule: false
    }
    this.setup()
  }
  componentWillUnmount() {
    chrome.storage.onChanged.removeListener( this.onStorageChanged )
  }
  onStorageChanged = (d,area) => {
    console.log('onStorageChanged',d,area)
    let dflat = {}
    for (let k in d) {
      dflat[k] = d[k].newValue
    }
    dflat.addingRule=false
    if (area == 'local') {
      // settings are stored in local storage,
      // so a setting has changed
      console.log('update state w/ storage change',dflat)
      this.setState(dflat)
    }
  }
  startAddRule = async (e) => {
    let ifaces = await chromise.system.network.getNetworkInterfaces()
    if (! this.state.settings.ipv6)
      ifaces = ifaces.filter( i=>i.prefixLength === 24 )
    this.setState({addingRule: true, ifaces:ifaces})
  }
  async setup() {
    let [ ifaces, storage ] =
        await Promise.all([chromise.system.network.getNetworkInterfaces(),
                           chromise.storage.local.get(['rules','settings'])])
    storage.settings = storage.settings || {}
    storage.rules = storage.rules || []
    updateDefaultSettings(storage.settings)
    if (! storage.settings.ipv6)
      ifaces = ifaces.filter( i=>i.prefixLength === 24 )
    this.setState({rules:storage.rules,
                   settings:storage.settings,
                   ifaces:ifaces,
                   ready:true})
  }
	render() {
    if (! this.state.ready) {
      return <div className="loadingDiv">Loading</div>
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
            <Button variant="contained" onClick={this.startAddRule}>Create Rule</Button> }
            <Settings settings={this.state.settings} />
            <hr />

            This software is open source (MIT)
            <br />
            Please <a href="https://chrome.google.com/webstore/detail/connection-forwarder/ahaijnonphgkgnkbklchdhclailflinn/reviews" target="_blank">leave a review</a> to help others find this software.
            <br />
            <a href="https://github.com/kzahel/connection-forwarder/wiki" target="_blank">FAQ / Help</a>.{' '}
            <a href="https://github.com/kzahel/connection-forwarder/issues" target="_blank">Report an issue</a>
        </div>
			</div>
		)
	}
}
export default MyApp
