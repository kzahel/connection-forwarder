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

  let toCheck = ['manifest.json', 'background.js', 'reloader.js','blackbox.js','runtime.js']
  toCheck = toCheck.concat(['panel.html','panel.js','styles.css','options.html'])

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
      const entry = await dentry.getFileEntry(filename)
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

  if (DEV) {
    while (true) {
      contents_tryreload() // most reliable
      await dosleep(2000)
    }
  }

})()
