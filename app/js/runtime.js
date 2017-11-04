const globalState = {
  storage:null,
  storageChange:false,
  handlingMessage:false
}

async function onStartup(details) {
  maybeLaunch('onStartup',details)
}

async function onInstalled(details) {
  maybeLaunch('onInstalled',details)
}

async function maybeLaunch(event, details) {
  console.log('maybeLaunch',event,details)
  let storage = await chromise.storage.local.get()
  storage = storage || {}
  storage.rules = storage.rules || []
  storage.settings = storage.settings || {}
  globalState.storage = storage
  console.log('storage',storage)
  updateDefaultSettings(globalState.storage.settings)
  if (event == 'onInstalled') {
    go()
    open_options()
  }
}

async function updateStorage(d) {
  console.assert(!globalState.storageChange)
  globalState.storageChange = true
  await chromise.storage.local.set(d)
  globalState.storageChange = false
}

async function handleMessage(msg, sender, sendResponse) {
  // handling message results in 

  function done(result) {
    console.log('sending response',result)
    globalState.handlingMessage = false
    // if sendMessage didn't specify a callback then this returns an error...
    // how to test if wants a callback?
    sendResponse(result)
  }
  // MUST call sendResponse at end of this function!
  // ?put in try/catch to ensure this?
  console.log('handle msg',msg)
  if (globalState.handlingMessage) return done({error:'another action is in progress'})
  globalState.handlingMessage = true
  
  function locateForward(id) {
    for (let lsock in Forwards) {
      let lrule = Forwards[lsock].defn
      if (lrule.id == id) {
        return parseInt(lsock)
      }
    }
  }
  
  if (msg.msg == 'deleteRule' || msg.msg == 'disableRule') {
    var lsock = locateForward(msg.rule.id)
    if (msg.msg == 'disableRule') {
      if (! lsock) return done({error:'could not find listening socket'})
      var res = await stop_forward(lsock)
      for (let rule of globalState.storage.rules) {
        if (rule.id == msg.rule.id) {
          rule.disabled = true
          await updateStorage({rules:globalState.storage.rules})
          return done({msg:'rule disabled'})
        }
      }
    } else {
      console.assert(msg.msg == 'deleteRule')
      if (lsock) {
        let res = await stop_forward(lsock)
        console.log('stop forward res',res)
      }
      let rules = globalState.storage.rules.filter( rule => rule.id !== msg.rule.id )
      globalState.storage.rules = rules
      await updateStorage({rules:rules})
      return done({msg:'rule deleted'})
    }
  } else if (msg.msg == 'enableRule') {
    var lsock = locateForward(msg.rule.id)
    if (lsock) return done({error:'rule already present. try later.'})
    for (let rule of globalState.storage.rules) {
      if (rule.id == msg.rule.id) {
        rule.disabled = false
        await updateStorage({rules:globalState.storage.rules})
        var res = await setup_forward(rule)
        return done({msg:'rule enabled'})
      }
    }
  } else if (msg.msg == 'addRule') {
    let newRule = JSON.parse(JSON.stringify(msg.rule))
    var res = await setup_forward(newRule)
    if (res.error) {
      return done({error:res.error.message})
    }
    // setup the forward first, see if there's an error, and dont add to list if there is ...
    newRule.id = (Math.floor(Math.random()*Math.pow(2,30))).toString()
    let newRules = globalState.storage.rules.concat([newRule])
    await updateStorage({rules:newRules})
    globalState.storage.rules = newRules
    return done({msg:'rule added',result:res})
  } else if (msg.msg == 'toggleEnabled') {
  } else if (msg.msg == 'changeSetting') {
    let [sett,v] = msg.change
    console.log('changesetting',sett,v)
    if (sett == 'forwardingEnabled') {
      let oldval = globalState.storage.settings[sett]
      globalState.storage.settings[sett] = v
      if (oldval != v) {
        await updateStorage({settings:globalState.storage.settings})
        if (v) {
          let res = await start_forwarding_all()
        } else {
          let res = await stop_forwarding_all()
        }
        return done(res)
      } else {
        return done('no change in enabled value')
      }
    } else {
      globalState.storage.settings[sett] = v
      await updateStorage({settings:globalState.storage.settings})
      if (sett == 'ipv6') {
        console.log('force refresh of network interfaces?')
      }
      return done('setting updated '+sett)
    }
  } else {
    return done('unhandled message')
  }
}

function onMessage(msg, sender, sendResponse) {
  handleMessage(msg,sender,sendResponse)
  return true
}

function pause() {
  console.log('pause forwarding connections')
}
function quit() {
  console.log('temporarily quit the app (e.g. close all windows and close all sockets and let it go inactive')
}

chrome.runtime.onStartup.addListener( onStartup )
chrome.runtime.onInstalled.addListener( onInstalled )
chrome.runtime.onMessage.addListener( onMessage )
