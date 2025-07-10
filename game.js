var Module = null

class GameApp {
    constructor(config) {
        config = config || {};
        this.config = config;
        this.editor = null;
        this.game = null;
        this.packName = 'engine.zip';
        this.projectDataName = 'game.zip';
        this.persistentPath = 'engine';
        this.logLevel = config.logLevel || LOG_LEVEL_NONE;
        this.projectData = config.projectData;
        this.oldData = config.projectData;
        this.gameCanvas = config.gameCanvas;
        this.assetURLs = config.assetURLs;
        this.useAssetCache = config.useAssetCache || true;
        this.gameConfig = {
            "executable": "engine",
            'unloadAfterInit': false,
            'canvas': this.gameCanvas,
            'logLevel': this.logLevel,
            'canvasResizePolicy': 1,
            'onExit': () => {
                this.onGameExit()
            },
        };
        this.logicPromise = Promise.resolve();
        this.curProjectHash = ''
        var EnginePackMode = "miniprogram"
        // web worker mode
        this.workerMode = EnginePackMode == "worker"
        this.minigameMode = EnginePackMode == "minigame"
        this.normalMode = !this.workerMode && !this.minigameMode

        this.pthreads = null;
        this.workerMessageId = 0;
        if (this.workerMode) {
            this.bindMainCallHandler()
        }
        this.logVerbose("EnginePackMode: ", EnginePackMode)
        
        this.tempZipPath = '/tmp/preload.zip';
        this.webPersistentPath = '/home/web_user';
        this.projectInstallName = config.projectName || "Game";
        this.debugInfo = "";

    }
    logVerbose(...args) {
        
        console.log(...args);
    }
    startTask(prepareFunc, taskFunc, ...args) {
        if (prepareFunc != null) {
            prepareFunc()
        }
        this.logicPromise = this.logicPromise.then(async () => {
            let promise = new Promise(async (resolve, reject) => {
                await taskFunc.call(this, resolve, reject, ...args);
            })
            await promise
        })
        return this.logicPromise
    }

    async RunGame() {
        return this.startTask(() => { this.runGameTask++ }, this.runGame)
    }

    async StopGame() {
        return this.startTask(() => { this.stopGameTask++ }, this.stopGame)
    }

    async runGame(resolve, reject) {
        let url = this.assetURLs["engine.wasm"]
        if (isWasmCompressed) {
            url += ".br"
        }
        //let engineUrl = this.assetURLs["game.zip"]
        //let engineData = await (await fetch(engineUrl)).arrayBuffer();
        //this.clearPersistence(this.tempZipPath);
        //await this.checkAndUpdateCache(engineData, true);
        await this.checkEngineCache()
        //this.writePersistence(this.editor, this.tempZipPath, engineData);

        if (!miniEngine && !this.gameConfig.wasmGdspx) {
            this.gameConfig.wasmGdspx = await (await fetch(url)).arrayBuffer();
        }

        this.runGameTask--
        // if stopGame is called before runing game, then do nothing
        if (this.stopGameTask > 0) {
            this.logVerbose("stopGame is called before runing game")
            resolve()
            return
        }

        let args = [
            '--main-pack', this.persistentPath + "/" + this.packName,
            '--main-project-data', this.persistentPath + "/" + this.projectDataName,
        ];

        this.logVerbose("RunGame ", args);
        if (this.game) {
            this.logVerbose('A game is already running. Close it first');
            resolve()
            return;
        }

        this.onProgress(0.5);
        this.game = new Engine(this.gameConfig);
        let curGame = this.game

        // register global functions
        window.gdspx_on_engine_start = function () { }
        window.gdspx_on_engine_update = function () { }
        window.gdspx_on_engine_fixed_update = function () { }
        window.goWasmInit = function () { }
        let funcMap = null;
        if (this.minigameMode) {
            GameGlobal.engine = this.game;
            godotSdk.set_engine(this.game);
            funcMap = globalThis
            self.initExtensionWasm = function () { }
        } else {
            if (!this.workerMode) {
                await this.loadLogicWasm()
                await this.runLogicWasm()
                self.initExtensionWasm = function () { }
            }
            funcMap = window
        }
        const spxfuncs = new GdspxFuncs();
        const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(spxfuncs));
        methodNames.forEach(key => {
            if (key.startsWith('gdspx_') && typeof spxfuncs[key] === 'function') {
                funcMap[key] = spxfuncs[key].bind(spxfuncs);
            }
        });


        curGame.init().then(async () => {
            this.onProgress(0.6);
            if (this.workerMode) {
                this.bindMainThreadCallbacks(curGame)
            }
            await this.unpackGameData(curGame)
            this.onProgress(0.7);
            if (this.minigameMode) {
                await this.loadLogicWasm()
            }
            this.onProgress(0.80);
            curGame.start({ 'args': args, 'canvas': this.gameCanvas }).then(async () => {
                if (this.minigameMode) {
                    FFI = self;
                    await this.runLogicWasm()
                }

                this.onProgress(0.9);
                this.gameCanvas.focus();
                if (this.workerMode) {
                    this.pthreads = curGame.getPThread()
                    this.callWorkerProjectDataUpdate(this.projectData)
                } else {
                    // register global functions
                    Module = curGame.rtenv;
                    FFI = self;
                    window.goLoadData(new Uint8Array(this.projectData));
                }
                this.onProgress(1.0);
                this.gameCanvas.focus();
                this.logVerbose("==> game start done")
                resolve()
            });
        });
    }

    async loadLogicWasm() {
        // load wasm
        let url = this.config.assetURLs["gdspx.wasm"];
        if (isWasmCompressed) {
            url += ".br"
        }
        this.go = new Go();
        if (this.minigameMode) {
            // load wasm in miniEngine
            const wasmResult = await WebAssembly.instantiate(url, this.go.importObject);
            // create compatible instance
            this.logicWasmInstance = Object.create(WebAssembly.Instance.prototype);
            this.logicWasmInstance.exports = wasmResult.instance.exports;
            Object.defineProperty(this.logicWasmInstance, 'constructor', {
                value: WebAssembly.Instance,
                writable: false,
                enumerable: false,
                configurable: true
            });
        } else {
            console.log("instantiateStreaming", this.gameConfig.wasmGdspx)
            const { instance } = await WebAssembly.instantiate(this.gameConfig.wasmGdspx, this.go.importObject);
            this.logicWasmInstance = instance;
        }
    }
    async runLogicWasm() {
        this.go.run(this.logicWasmInstance);
        if (!this.minigameMode) {
            if (this.config.onSpxReady != null) {
                this.config.onSpxReady()
            }
        }
    }

    async unpackGameData(curGame) {
        let packUrl = this.assetURLs[this.packName]
        let pckData = await (await fetch(packUrl)).arrayBuffer();
        await curGame.unpackGameData(this.persistentPath, this.projectDataName, this.projectData.buffer, this.packName, pckData)
    }


    async stopGame(resolve, reject) {
        this.stopGameTask--
        if (this.game == null) {
            // no game is running, do nothing
            resolve()
            this.logVerbose("no game is running")
            return
        }
        this.pthreads = null
        this.stopGameResolve = () => {
            this.game = null
            resolve();
            this.stopGameResolve = null
        }
        this.onProgress(1.0);
        this.game.requestQuit()
    }

    onGameExit() {
        this.game = null
        this.logVerbose("on game quit")
        if (this.stopGameResolve) {
            this.stopGameResolve()
        }
    }
    //------------------ misc ------------------
    onProgress(value) {
        if (this.config.onProgress != null) {
            this.config.onProgress(value);
        }
    }

    // === PThread Worker message sending related methods ===
    bindMainThreadCallbacks(game) {
        game.rtenv["_spxOnMainCall"] = window._spxOnMainCall
    }

    bindMainCallHandler() {
        window._spxMainCalls = {}
        window._spxOnMainCall = function (...params) {
            let funcName = params[0]
            let args = params.slice(1)
            if (window._spxMainCalls.hasOwnProperty(funcName)) {
                let callback = window._spxMainCalls[funcName]
                if (callback != null) {
                    callback(...args)
                }
            } else {
                let func = window[funcName]
                if (func != null) {
                    func(...args)
                } else {
                    console.error("no such function: ", funcName)
                }
            }
        }
    }
    callWorkerProjectDataUpdate(projectData) {
        const message = {
            cmd: 'projectDataUpdate',
            data: projectData,
            timestamp: Date.now()
        };
        return this.postMessageToWorkers(message);
    }

    callWorkerFunction(funcName, args) {
        // if args is not an array, convert it to an array
        const argsArray = Array.isArray(args) ? args : [args];

        // auto process arguments, convert function to main thread callback
        const processedArgs = this.processArguments(argsArray);

        const message = {
            cmd: 'customCall',
            data: {
                funcName: funcName,
                args: processedArgs
            },
            timestamp: Date.now()
        };
        return this.postMessageToWorkers(message);
    }

    // process arguments, auto convert function to main thread callback
    processArguments(args) {
        if (!args || !Array.isArray(args)) {
            return args;
        }

        const processedArgs = [];
        let callbackCounter = 0;

        for (let arg of args) {
            if (typeof arg === 'function') {
                // generate unique callback name
                const callbackName = `_onSpxCall_${Date.now()}_${callbackCounter++}`;

                // register callback function
                this.registerWorkerCallback(callbackName, arg);

                // replace with main thread callback identifier
                processedArgs.push("_SPX_CALLBACK_FUNC_", callbackName);
            } else {
                processedArgs.push(arg);
            }
        }

        return processedArgs;
    }

    // register worker callback function
    registerWorkerCallback(callbackName, userFunction) {
        // create callback handler function
        window._spxMainCalls[callbackName] = async function (requestId, ...args) {
            let errorMsg = null;
            let result = null;

            try {
                if (userFunction) {
                    result = userFunction(...args);
                    // if return Promise, wait for it to complete
                    if (result && typeof result.then === 'function') {
                        result = await result;
                    }
                } else {
                    errorMsg = `No function registered for ${callbackName}`;
                }
            } catch (error) {
                console.error(`Error in ${callbackName}:`, error);
                errorMsg = error.message;
            }

            // send response to worker
            this.postMessageToWorkers({
                cmd: 'callResponse',
                responseId: requestId,
                result: result,
                error: errorMsg
            });
        }.bind(this);
    }

    postMessageToWorkers(message, transferList = null, cloneForEach = false) {
        const workers = [];
        if (this.pthreads) {
            workers.push(...this.pthreads.runningWorkers);
        }

        let successCount = 0;
        let errorCount = 0;

        workers.forEach((worker, index) => {
            try {
                if (worker && typeof worker.postMessage === 'function') {
                    // Adds unique identifier and target info to each message
                    let enhancedMessage = {
                        ...message,
                        _gameAppMessageId: ++this.workerMessageId,
                        _targetWorkerIndex: index,
                        _timestamp: Date.now()
                    };

                    // Special handling required when cloning data or using transferList
                    if (transferList && cloneForEach) {
                        if (message.data && message.data.buffer) {
                            const clonedData = new Uint8Array(message.data);
                            enhancedMessage.data = clonedData;
                            worker.postMessage(enhancedMessage, [clonedData.buffer]);
                        } else {
                            worker.postMessage(enhancedMessage);
                        }
                    } else {
                        worker.postMessage(enhancedMessage);
                    }

                    successCount++;
                } else {
                    console.warn(`Worker ${index} is invalid or does not have postMessage method`);
                    errorCount++;
                }
            } catch (error) {
                console.error(`Failed to send message to worker ${index}:`, error);
                errorCount++;
            }
        });

        return { successCount, errorCount, totalWorkers: workers.length };
    }



    //------------------ install project ------------------
    getInstallPath() {
        return `${this.webPersistentPath}/${this.projectInstallName}`;
    }

    writePersistence(engine, targetPath, value) {
        if (engine == null) {
            console.error("please init egnine first!")
            return
        }
        engine.copyToFS(targetPath, value);
    }
    clearPersistence(targetPath) {
        const req = indexedDB.deleteDatabase(targetPath);
        req.onerror = (err) => {
            alert('Error deleting local files. Please retry after reloading the page.');
        };
        this.logVerbose("clear persistence cache", targetPath);
    }

    getObjectStore(dbName, storeName, mode, storeKeyPath) {
        return new Promise((resolve, reject) => {
            let request = indexedDB.open(dbName);

            request.onupgradeneeded = function (event) {
                let db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    if (storeKeyPath) {
                        db.createObjectStore(storeName, { keyPath: storeKeyPath });
                    } else {
                        db.createObjectStore(storeName);
                    }

                }
            };

            request.onsuccess = function (event) {
                let db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    reject(`Object store "${storeName}" not found`);
                    db.close();
                    return;
                }

                let transaction = db.transaction(storeName, mode);
                let objectStore = transaction.objectStore(storeName);
                resolve({ db, objectStore, transaction });
            };

            request.onerror = function (event) {
                reject('Error opening database: ' + dbName + " " + storeName + " " + event.target.error);
            };

            request.onblocked = function (event) {
                reject('Database is blocked. Please close other tabs or windows using this database. ', dbName + " " + storeName + " " + event.target.error);
            }
        });
    }

    queryIndexDB(dbName, storeName, key) {
        return this.getObjectStore(dbName, storeName, 'readonly').then(({ db, objectStore, transaction }) => {
            return new Promise((resolve, reject) => {
                let getRequest = objectStore.get(key);

                getRequest.onsuccess = function () {
                    resolve(getRequest.result);
                };

                getRequest.onerror = function () {
                    reject('Error checking key existence');
                };

                transaction.oncomplete = function () {
                    db.close();
                };
            });
        });
    }

    updateIndexDB(dbName, storeName, key, value) {
        return this.getObjectStore(dbName, storeName, 'readwrite', key).then(({ db, objectStore, transaction }) => {
            return new Promise((resolve, reject) => {
                let putRequest = objectStore.put(value, key);

                putRequest.onsuccess = function () {
                    resolve('Value successfully written to the database');
                };

                putRequest.onerror = function () {
                    reject('Error writing value to the database');
                };

                transaction.oncomplete = function () {
                    db.close();
                };
            });
        });
    }
    async getCache(storeName) {
        try {
            let cacheValue = await this.queryIndexDB(this.webPersistentPath, 'FILE_DATA', storeName);
            console.log("getCache ", storeName, cacheValue)
            return cacheValue;
        } catch (error) {
            console.error(error);
            return undefined;
        }
    }

    async setCache(storeName, value) {
        try {
            let cacheValue = await this.updateIndexDB(this.webPersistentPath, 'FILE_DATA', storeName, value);
            console.log("setCache ", storeName, cacheValue)
            return cacheValue;
        } catch (error) {
            console.error(error);
            return undefined;
        }
    }

    async computeHash(data) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }
    getProjectDataKey() {
        return `${this.webPersistentPath}/.spx_cache_data/${this.projectInstallName}`
    }
    getProjectHashKey() {
        return `${this.webPersistentPath}/.spx_cache_hash/${this.projectInstallName}`
    }

    async updateProjectHash(hash) {
        this.logVerbose("updateProjectHash ", hash)
        await this.setCache(this.getProjectHashKey(), hash);
    }
    async checkAndUpdateCache(curData, isClearIfDirty = false) {
        // TODO only cache art resources
        let curHash = await this.computeHash(curData);
        let cachedHash = await this.getCache(this.getProjectHashKey());
        this.curProjectHash = curHash
        this.logVerbose("checkAndUpdateCache ", this.getProjectHashKey(), curHash, " old_hash = ", cachedHash)
        if (cachedHash != undefined && curHash === cachedHash) {
            return true;
        }
        if (isClearIfDirty) {
            await this.updateProjectHash('')
            // clear the dirty cache
            // TOOD only clear the current project's cache data
            this.clearPersistence(this.webPersistentPath);
            // create a default indexDB
            await this.ensureCacheDB()
        } else {
            await this.updateProjectHash(this.curProjectHash)
        }
        // cache is dirty, update it 
        await this.setCache(this.getProjectDataKey(), curData);
        return false;
    }

    async ensureCacheDB() {
        await this.getObjectStore(this.webPersistentPath, 'FILE_DATA', 'readonly')
    }

    getEngineHashKey(assetName) {
        return `${this.webPersistentPath}/.spx_engine_hash/${assetName}`
    }
    getEngineDataKey(assetName) {
        return `${this.webPersistentPath}/.spx_engine_data/${assetName}`
    }
    async checkEngineCache() {
        let hashes = GetEngineHashes()
        this.logVerbose("curHashes ", hashes)
        this.gameConfig.wasmGdspx = await this.checkCacheAsset(hashes, "gdspx.wasm");
        this.gameConfig.wasmEngine = await this.checkCacheAsset(hashes, "engine.wasm");
        console.log("checkEngineCache ", this.gameConfig.wasmGdspx, this.gameConfig.wasmEngine)
    }

    async checkCacheAsset(hashes, assetName) {
        try {
            let url = this.assetURLs[assetName]
            if (!this.useAssetCache) {
                return await (await fetch(url));
            }

            let curHash = hashes[assetName];
            await this.ensureCacheDB();

            const cachedHash = await this.getCache(this.getEngineHashKey(assetName));
            const isCacheValid = cachedHash !== undefined && curHash === cachedHash;

            if (!isCacheValid) {
                this.logVerbose("Download engine asset:", assetName, url);
                this.debugInfo += `Download engine asset: ${assetName} ${url}\n`;
                const curData = await (await fetch(url));
                await this.setCache(this.getEngineDataKey(assetName), curData);
                await this.setCache(this.getEngineHashKey(assetName), curHash);
                return curData;
            } else {
                this.logVerbose("Load cached engine asset:", assetName);
                this.debugInfo += `Load cached engine asset: ${assetName}\n`;
                const curData = await this.getCache(this.getEngineDataKey(assetName));
                return curData;
            }
        } catch (error) {
            console.error("Error checking engine cache asset:", error);
            throw error;
        }
    }

}

// export GameApp to global
globalThis.GameApp = GameApp;
//aaaa
function GetEngineHashes() { 
	return {
"gdspx.wasm":"453010c8bea1fec27128c1724b94d3aed8be6385e61ae00e3950d5582f6bd145",
"engine.wasm":"84baa374bfa7e076aa0e0fbf35c2eb77024618f8955a64f4c53bc1db22cbf2a2",

	}
}
	