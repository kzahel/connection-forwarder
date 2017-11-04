import React from 'react'
import MenuItem from 'material-ui/Menu/MenuItem';
import TextField from 'material-ui/TextField'
import { FormControl, FormHelperText } from 'material-ui/Form';
import Input, { InputLabel } from 'material-ui/Input';
import Select from 'material-ui/Select';
import Button from 'material-ui/Button';

let classes = {
  menu: "clsMenu",
  port: "clsPort",
  formControl: "poop"
}
const protocols = ['TCP','UDP']

class InputFirewallRule extends React.Component {
  constructor(props) {
    super(props)

    let common_addr = [
      {address:'0.0.0.0', label:'Anywhere'},
      {address: constants.android_ip, label:'Internal Android'},
      {address:'127.0.0.1', label:'Localhost'}
    ]
    this.addr_dropdown = []

    for (let c of common_addr) {
      this.addr_dropdown.push(c)
    }
    for (let iface of props.ifaces) {
      let d = {
        address:iface.address,
        label:`${iface.address} (${iface.name})`
      }
      this.addr_dropdown.push(d)
    }
    this.addr_dropdown.push( {address:'Custom',label:'Custom'} )

    this.addr_dropdown_lookup = {}
    for (let addr of this.addr_dropdown) {
      this.addr_dropdown_lookup[addr.label] = addr
    }
    this.state = {
      protocol: 'TCP',
      src_port: 9000,
      dst_port: 8000,
      src_addr: this.addr_dropdown[0],
      dst_addr: this.addr_dropdown[2]
    }
  }

  handleAdd = async (event) => {
    window.lastRule = this.state
    console.log('add rule',this.state)
    let resp = await chromise.runtime.sendMessage({msg:'addRule',rule:this.state})
    console.log('add rule resp',resp)
    if (resp.error) {
      this.setState({error:resp.error})
    } else {
      app.setState({addingRule:false})
    }
  }
  
  handleChange = name => event => {
    if (name == 'src_addr' || name == 'dst_addr') {
      let addr = this.addr_dropdown_lookup[event.target.value]
      this.setState({
        [name]: addr
      })
    } else if (name == 'src_port' || name == 'dst_port') {
      let val = parseInt(event.target.value)
      this.setState({
        [name]: val
      })
    }
  }
  checkPortError(port) {
    let pval = parseInt(port)
    return pval < 1024 || pval > 65535
  }
  render() {
    let prots = protocols.map(option => (
      <MenuItem key={option} value={option}>
        {option}
      </MenuItem>
    ))
    let sources = this.addr_dropdown.map(option => (
      <MenuItem key={option.label} value={option.label}>
        {option.label}
      </MenuItem>
    ))
    let destinations = this.addr_dropdown.map(option => (
      <MenuItem key={option.label} value={option.label}>
        {option.label}
      </MenuItem>
    ))
    
    return (
      <div className="ruleContainer">
        New firewall Rule
        {this.state.error?JSON.stringify(this.state.error):''}
        <br />

        <FormControl className={classes.formControl} disabled>
          <InputLabel htmlFor="protocol">Protocol</InputLabel>
          <Select
            value={this.state.protocol}
            onChange={this.handleChange('protocol')}
            input={<Input id="protocol"/>}

          >
            {prots}
          </Select>
        </FormControl>
        
        <TextField
          select
          label="Source Address"
          value={this.state.src_addr.label}
          onChange={this.handleChange('src_addr')}
          >
          {sources}
			  </TextField>

        <TextField
          label="Source Port"
          error={this.checkPortError(this.state.src_port)}
          helperText={this.checkPortError(this.state.src_port) && "Must be between 1024 and 65536"}
          value={this.state.src_port}
          onChange={this.handleChange('src_port')}
          type="number"
          className={classes.port}
          InputLabelProps={{
            shrink: true
          }}
          margin="normal"
          />

        <TextField
          select
          label="Destination Address"
          value={this.state.dst_addr.label}
          onChange={this.handleChange('dst_addr')}
          >
          {destinations}
			  </TextField>


        <TextField
          label="Destination Port"
          value={this.state.dst_port}
          onChange={this.handleChange('dst_port')}
          type="number"
          className={classes.port}
          InputLabelProps={{
            shrink: true
          }}
          margin="normal"
          />
        {/*
        <div>Forward {this.state.protocol} packets
          {' '}from {this.getAddress(this.state.src_addr)}:{this.state.src_port}
          {' '}to {this.getAddress(this.state.dst_addr)}:{this.state.dst_port}
        </div>
        */}
        <Button raised onClick={this.handleAdd}>
          Add Rule
        </Button>
        
      </div>
    )
  }
  getAddress(defn) {
    return defn.address
  }
}

export default InputFirewallRule
