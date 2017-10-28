window.FileSystem = (function(navigator, Promise) {
	'use strict';

	function FileSystem(minimum_size, type) {
		this.fs = null;
		this.minimum_size = minimum_size || 1024 * 1024 * 5;
		this.type = type || window.PERSISTENT;

		this.promise = new Promise(this.__init__.bind(this));
	}

	FileSystem.prototype.then = function(oncomplete, onerror) {
		return this.promise.then.call(this.promise, oncomplete, onerror);
	};

	FileSystem.prototype.catch = function(onerror) {
		return this.promise.catch.call(this.promise, onerror);
	};

	FileSystem.prototype.__init__ = function(resolve, reject) {
		var self = this;
		return self.getStatistics().then(function(stats) {
			if (stats.allocated < self.minimum_size) {
				return self.allocate(self.minimum_size).then(function(allocated) {
					return self.__getBrowserFileSystem__(self.type, allocated);
				});
			}
			return self.__getBrowserFileSystem__(self.type, stats.allocated);
		})
		.then(function(fs) {
			self.fs = fs;
			resolve(fs);
		})
		.catch(reject);
	};

	FileSystem.prototype.getRoot = function() {
		var self = this;
		return this.then(function(fs) {
			return self.__modifyEntryInterface__(fs.root);
		});
	};

	var resolveURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;
	FileSystem.prototype.getURL = function(url) {
		var self = this;
		return this.then(function(fs) {
			var rootURL = fs.root.toURL();
			var revised = rootURL.substr(0, rootURL.length - 1) + url;
			return new Promise(function(resolve, reject) {
				resolveURL(revised, self.makeEntryCallback(resolve), reject);
			});
		});
	};


	FileSystem.prototype.makeEntryCallback = function(resolve) {
		var self = this;
		return function(entry) {
			self.__modifyEntryInterface__(entry);
			resolve(entry);
		};
	};


	FileSystem.prototype.__modifyEntryInterface__ = function(entry) {
		var prototype = entry.constructor.prototype,
			self = this;
		if (prototype.__modified__) {
			return entry;
		}

		prototype.__modified__ = true;
		if (entry.isDirectory) {
			this.__modifyDirectoryInterface__(prototype, entry);
		} else if (entry.isFile) {
			this.__modifyFileInterface__(prototype, entry);
		}

		var __getMetadata__ = prototype.getMetadata;
		prototype.getMetadata = function() {
			var that = this;
			return new Promise(function(resolve, reject) { __getMetadata__.call(that, resolve, reject) });
		};

		var __moveTo__ = prototype.moveTo;
		prototype.moveTo = function(parent, newName) {
			var that = this;
			return new Promise(function(resolve, reject) {
				__moveTo__.call(that, parent, newName, self.makeEntryCallback(resolve), reject);
			});
		};

		var __copyTo__ = prototype.copyTo;
		prototype.copyTo = function(parent, newName) {
			var that = this;
			return new Promise(function(resolve, reject) {
				__copyTo__.call(that, parent, newName, self.makeEntryCallback(resolve), reject);
			});
		};

		var __getParent__ = prototype.getParent;
		prototype.getParent = function() {
			var that = this;
			return new Promise(function(resolve, reject) {
				__getParent__.call(that, self.makeEntryCallback(resolve), reject);
			});
		};

		var __remove__ = prototype.remove;
		prototype.remove = function() {
			var that = this;
			return new Promise(function(resolve, reject) { __remove__.call(that, resolve, reject); });
		};

		return entry;
	};

	FileSystem.prototype.__modifyFileInterface__ = function(prototype, entry) {
		var self = this;

		prototype.getFile = function() {
			var that = this;
			return new Promise(function(resolve, reject) { that.file(self.makeEntryCallback(resolve), reject); });
		};

		var __createWriter__ = prototype.createWriter;
		prototype.createWriter = function() {
			var that = this;
			return new Promise(function(resolve, reject) { __createWriter__.call(that, resolve, reject); });
		};

		prototype.write = function(blob) {
			var self = this;
			return this.createWriter().then(function(writer) {
				writer.write(blob);
				return self.createWriter();
			}).then(function(writer) {
				writer.truncate(blob.size);
				return self;
			});
		};

	};


	FileSystem.prototype.__modifyDirectoryInterface__ = function(prototype, entry) {
		var self = this;

		prototype.getFileEntry = function(path, options) {
			var that = this;
			return new Promise(function(resolve, reject) {
				that.getFile(path, options, self.makeEntryCallback(resolve), reject);
			});
		};

		prototype.makeFileEntry = function(path, exclusive) {
			return this.getFileEntry(path, {
				create: true,
				exclusive: exclusive ? true : false
			});
		};

		var __getDirectory__ = prototype.getDirectory;
		prototype.getDirectory = function(path, options) {
			var that = this;
			return new Promise(function(resolve, reject) {
				__getDirectory__.call(that, path, options, self.makeEntryCallback(resolve), reject);
			});
		};

		prototype.makeDirectory = function(path, exclusive) {
			return this.getDirectory(path, {
				create: true,
				exclusive: exclusive ? true : false
			});
		};

		var __removeRecursively__ = prototype.removeRecursively;
		prototype.removeRecursively = function() {
			var that = this;
			return new Promise(function(resolve, reject) { __removeRecursively__.call(that, resolve, reject); });
		};

		prototype.readEntries = function() {
			var reader = this.createReader();
			return new Promise(function(resolve, reject) {
				var results = [];
				reader.readEntries(function getEntries(entries) {
					if (entries.length === 0) {
						return resolve(results);
					}

					results = results.concat(Array.prototype.map.call(entries, self.__modifyEntryInterface__.bind(self)));
					reader.readEntries(getEntries, reject);
				}, reject);
			});
		};
	};


	var persistentStorage = navigator.persistentStorage || navigator.webkitPersistentStorage;
	FileSystem.prototype.getStatistics = function() {
		return new Promise(function(resolve, reject) {
			persistentStorage.queryUsageAndQuota(function(usage, allocated) {
				resolve({
					usage: usage,
					allocated: allocated
				});
			}, reject);
		});
	};

	FileSystem.prototype.allocate = function(size) {
		return new Promise(function(resolve, reject) {
			persistentStorage.requestQuota(size, resolve, reject);
		});
	};

	var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
	FileSystem.prototype.__getBrowserFileSystem__ = function(type, fs_size) {
		return new Promise(function(resolve, reject) {
			requestFileSystem(type, fs_size, resolve, reject);
		});
	};

	File.prototype.__read__ = function(cache, func) {
		var self = this;
		return new Promise(function(resolve, reject) {
			if (typeof self[cache] !== 'undefined') {
				return resolve(self[cache]);
			}

			var reader = new FileReader();

			reader.onload = function(data) {
				self[cache] = event.target.result;
				resolve(self[cache]);
			};
			reader.onerror = reject;

			func.call(self, reader);
		});
	};

	File.prototype.readAsDataURL = function() {
		return this.__read__('__dataURL__', function(reader) {
			reader.readAsDataURL(this);
		});
	};


	File.prototype.readAsArrayBuffer = function() {
		return this.__read__('__buffer__', function(reader) {
			reader.readAsArrayBuffer(this);
		});
	};


	File.prototype.readAsText = function(label) {
		return this.__read__('__text__', function(reader) {
			reader.readAsText(this, label);
		});
	};


	return FileSystem;
})(window.navigator, window.Promise);
