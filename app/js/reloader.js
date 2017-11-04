(async function() {
  /* little reloader module. reloads the extension if changes are
   * detected in source files */
  
  let range = function*(start = 0, stop, step = 1) {
    let cur = (stop === undefined) ? 0 : start;
    let max = (stop === undefined) ? start : stop;
    for (let i = cur; step < 0 ? i > max : i < max; i += step)
      yield i
  }

  const mTimes = {}
  const dir = await chromise.runtime.getPackageDirectoryEntry()
  const dentry = FileSystem.prototype.__modifyEntryInterface__(dir)

  let toCheck = ['manifest.json', 'js/background.js', 'js/reloader.js','js/blackbox.js','js/runtime.js','dist/bundle.js']
  toCheck = toCheck.concat(['settings.html'])

  var lastVer = null
  async function version_tryreload() {
    // reload based on manifest version changing
    const entry = await dentry.getFileEntry('manifest.json')
    const file = await entry.getFile()
    const text = await file.readAsText()
    const j = JSON.parse(text)
    const version = j.version
    if (! lastVer) {
      lastVer = version
    } else if (lastVer !== version) {
      console.log('manifest version changed -- reload')
      await dosleep(1000)
      chrome.runtime.reload()
    }
  }

  function lpad(s,l,fill='0') {
    if (s.length < l) {
      return lpad(fill.concat(s), l-1)
    } else {
      return s
    }
  }

  const fhashes = {}
  
  async function contents_tryreload() {
    // actually read file contents and do sha1 or something and if any changed, reload.
    for (let filename of toCheck) {
      var entry
      try {
        entry = await dentry.getFileEntry(filename)
      } catch(e) {
        continue
      }
      const file = await entry.getFile()
      const text = await file.readAsArrayBuffer()
      const digest = await crypto.subtle.digest({name:'SHA-1'},text)
      const view = new Uint8Array(digest)
      const hash = [...range(20)].map( i => lpad(view[i].toString(16),2) ).join('')

      if (! fhashes[filename] ) {
        fhashes[filename] = hash
      } else if (fhashes[filename] !== hash) {
        console.log('file contents changed:',filename,hash,'reloading...')
        //await dosleep(2000) // wait a bit in case still using forwarding app to scp files which caused this update !
        fhashes[filename] = hash
        chrome.runtime.reload()
      }
    }
  }
  
  async function mtime_tryreload() {
    // modification times are unreliable (don't change for package directory entry or are inconsistent somehow)
    // instead just check manifest version
    const metas = await Promise.all( toCheck.map( fn => dentry.getMetadata(fn) ) )
    var filename
    var meta
    for (let i of [...range(toCheck.length)]) {
      filename = toCheck[i]
      meta = metas[i]
      console.log(i,filename,meta.modificationTime)
      if (! mTimes[filename]) {
        mTimes[filename] = meta.modificationTime
      } else if (mTimes[filename].getTime() != meta.modificationTime.getTime()) {
        var told = mTimes[filename].getTime()
        var tnew = meta.modificationTime.getTime()
        console.log('file modification time changed! reloading...',filename,told,tnew)
        await dosleep(10000)
        //chrome.runtime.reload()
      }
    }
  }

  async function listen_localhost_tryreload() {
    let sock = await chromise.sockets.tcpServer.create()
    var watch = {}
    function onAccept(info) {
      if (info.socketId == sock.socketId) {
        watch[info.clientSocketId] = true
        chrome.sockets.tcp.setPaused( info.clientSocketId, false )
      }
    }
    function onReceive(info) {
      //console.log('recv',info)
      if (! watch[info.socketId]) return // not our socket
      var msg = new TextDecoder('utf-8').decode(info.data)
      //console.log(msg)
      if (msg.trim() === 'reloadpls') {
        console.log('inotifywatch -- reloading')
        chromise.sockets.tcp.close(info.socketId)
        delete watch[info.socketId]
        chrome.runtime.reload()
      }
    }
    chrome.sockets.tcp.onReceive.addListener( onReceive )
    chrome.sockets.tcpServer.onAccept.addListener( onAccept )
    await chromise.sockets.tcpServer.listen(sock.socketId, '192.168.64.1', 9337 )
    await chromise.sockets.tcpServer.setPaused( sock.socketId, false )
    console.log('setup debugging reloader sock',sock.socketId)
  }

  if (DEV) {
    if (false) {
      while (true) {
      contents_tryreload() // most reliable
        await dosleep(2000)
      }
    } else {
      await dosleep(2000) // dont reload in first few seconds of bootup
      // because inotify is actually sending two modify events for some reason
      listen_localhost_tryreload()
    }
  }

})()
