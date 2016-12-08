'use strict';

const IconvLite = require('iconv-lite');
const Path = require("path");
const Fs = require('fire-fs');
const Spawn = require('child_process').spawn;
const TreeKill = require('tree-kill');

// only used on windows
let pyPath = Editor.url('unpack://utils/Python27/python');
let cocosConsoleRoot;
let cocosRoot;
let cocosConsoleBin;
let nativeLogPath;
let showLogInConsole = true;
let env;
let envStr;
let platform = 'android'; //cjh fixme

let _prebuiltProcess;

function initCocosBin() {
    let profileData = Editor.App._profile.data;

    cocosRoot = profileData['use-default-cpp-engine'] ? Editor.builtinCocosRoot : profileData['cpp-engine-path'];
    console.log('Cocos2dx root: ' + cocosRoot);

    if (cocosRoot.indexOf(' ') !== -1) {
        return new Error(`Cocos2dx root [${cocosRoot}] can\'t include space.`);
    }

    cocosConsoleRoot = Path.join(cocosRoot, 'tools/cocos2d-console/bin');

    if (process.platform === 'darwin') {
        cocosConsoleBin = Path.join(cocosConsoleRoot, 'cocos');
    } else {
        cocosConsoleBin = Path.join(cocosConsoleRoot, 'cocos.py');
    }

    return null;
}

function initCocosEnv(opts) {
    opts = opts || {};

    let profileData = Editor.App._profile.data;

    // cocos settings
    let error = initCocosBin();
    if (error) {
        return error;
    }

    // android settings
    let antRoot = opts.antRoot || profileData['ant-root'];
    let ndkRoot = opts.ndkRoot || profileData['ndk-root'];
    let androidSDKRoot = opts.androidSDKRoot || profileData['android-sdk-root'];

    // environment
    env = {
        COCOS_FRAMEWORKS: Path.join(cocosRoot, '../'),
        COCOS_X_ROOT: cocosRoot,
        COCOS_CONSOLE_ROOT: cocosConsoleRoot,
        ANT_ROOT: antRoot,
        NDK_ROOT: ndkRoot,
        ANDROID_SDK_ROOT: androidSDKRoot
    };

    // format environment string
    envStr = '';
    for (let k in env) {
        if (envStr !== '') {
            envStr += ';';
        }

        envStr += `${k}=${env[k]}`;
    }

    function checkCocosSetting(type, path) {
        if (!path) {
            return new Error(`[${type}] is empty, please set [${type}] in Preferences.`);
        }

        if (!Fs.existsSync(path)) {
            return new Error(`Can\'t find [${type}] path: ${path}`);
        }

        return null;
    }

    error = checkCocosSetting('Cocos Console Root', cocosConsoleRoot);
    if (error) {
        return error;
    }

    if (!Fs.existsSync(cocosConsoleBin)) {
        return new Error(`Can\'t find Cocos Console Bin: ${cocosConsoleBin}`);
    }

    if (platform === 'android') {
        error = checkCocosSetting('NDK Root', ndkRoot);
        if (error) {
            return error;
        }

        error = checkCocosSetting('Android SDK Root', androidSDKRoot);
        if (error) {
            return error;
        }

        error = checkCocosSetting('ANT Root', antRoot);
        if (error) {
            return error;
        }

        if (process.platform === 'win32') {
            if (!process.env.JAVA_HOME || !Fs.existsSync(process.env.JAVA_HOME)) {
                return new Error('Please make sure java is installed and JAVA_HOME is in your environment');
            }
        }
    }

    return null;
}

/**
 * @param    {ChildProcess}     child        child process
 * @param    {Object}     opts
 *                 logToFile - whether write log to file
 *                 useSystemEncoding - whether read system encoding for log
 *                 prefix - log prefix
 * @param    {Function} callback - child process close callback
 */
function handleChildProcess(child, opts, callback) {
    Editor.log(`handleChildProcess`);
    let encoding = 'utf-8';
    let defaultOpts = {
        logFilePath: '',
        disableEditorLog: !showLogInConsole,
        useSystemEncoding: true,
        prefix: ''
    };

    if (typeof opts === 'function') {
        callback = opts;
        opts = defaultOpts;
    } else {
        opts = Object.assign(defaultOpts, opts);
    }

    function registerEvents() {
        let writeStream;
        if (opts.logFilePath) {
            Fs.ensureFileSync(opts.logFilePath);

            writeStream = Fs.createWriteStream(opts.logFilePath, {
                defaultEncoding: encoding
            });
        }

        child.stdout.on('data', data => {
            if (writeStream) {
                writeStream.write(data);
            }

            if (opts.disableEditorLog) {
                return;
            }

            let info;
            if (process.platform === 'win32') {
                info = IconvLite.decode(data, encoding);
            } else {
                info = data.toString();
            }

            if (info.length > 1) {
                info = info.replace(/\n*$/g, '');
            }

            let infos = info.split('\n');

            infos.forEach(info => {
                if (opts.prefix) {
                    info = opts.prefix + ' : ' + info;
                }

                Editor.log(info);
            });
        });
        child.stderr.on('data', data => {
            if (writeStream) {
                writeStream.write(data);
            }

            if (opts.disableEditorLog) {
                return;
            }

            let info;
            if (process.platform === 'win32') {
                info = IconvLite.decode(data, encoding);
            } else {
                info = data.toString();
            }

            // let infos = info.split('\n');
            // infos.forEach(info => {
            if (opts.prefix) {
                info = opts.prefix + ' : ' + info;
            }

            if (info.indexOf('warning') !== -1) {
                Editor.warn(info);
            } else {
                Editor.failed(info);
            }
            // });
        });
        child.on('close', (code, signal) => {
            if (writeStream) {
                writeStream.close();
            }

            callback.call(child, null, code, signal);
        });
        child.on('error', function(err) {
            callback.call(child, err);
        });
    }

    //cjh if (opts.useSystemEncoding) {
    //         getSysEncoding((err, result) => {
    //                 encoding = result;
    //                 registerEvents();
    //         });
    //         return;
    // }

    registerEvents();
}

function getCocosSpawnProcess(args, spawnOpts) {
    var child;

    let error = initCocosBin();
    if (error) {
        return [error, child];
    }

    args = [cocosConsoleBin].concat(args);

    try {
        if (process.platform === 'darwin') {
            child = Spawn('sh', args, spawnOpts);
        } else {
            // use the internal python on windows
            child = Spawn(pyPath, args, spawnOpts);
        }
    } catch (err) {
        error = err;
    }

    return {
        error: error,
        child: child
    };
}

function onCompileFailed(errorStr) {
    Editor.error(new Error(errorStr));
    Editor.Ipc.sendToPanel('binary-creator', 'binary-creator:onCompileFailed', errorStr);
}

function onCompileSucceed() {
    Editor.log('Success compile cocos prebuilt libs.');
    Editor.Ipc.sendToPanel('binary-creator', 'binary-creator:onCompileSucceed');
}

function compilePrebuilt(args, spawnOpts) {
    let err = initCocosEnv();
    if (err) {
        onCompileFailed(err);
        return;
    }

    args.push('--env');
    args.push(envStr);

    let ret = getCocosSpawnProcess(args, spawnOpts);

    if (ret.error) {
        onCompileFailed(ret.error);
        return;
    }
    _prebuiltProcess = ret.child;

    handleChildProcess(_prebuiltProcess, {
            logFilePath: nativeLogPath,
            disableEditorLog: !showLogInConsole
        },
        (err, code) => {
            if (err) {
                onCompileFailed(err);
                return;
            }

            if (code !== 0) {
                onCompileFailed(`Failed compile cocos prebuilt libs.`);
                return;
            }

            onCompileSucceed();
        }
    );
}

function stopCompilePrebuilt() {
    if (_prebuiltProcess) {
        TreeKill(_prebuiltProcess.pid);
        _prebuiltProcess = null;
    }
}

module.exports = {
    load() {
        // 当 package 被正确加载的时候执行
    },

    unload() {
        // 当 package 被正确卸载的时候执行
    },

    messages: {
        'binary-creator:open' () {
            Editor.Panel.open('binary-creator');
        },
        'start-compile' (event, args, spawnOpts) {
            Editor.log(`args:${args}`);
            compilePrebuilt(args, spawnOpts);
            // Editor.Ipc.sendToPanel('spawn-process', );
        },
        'stop-compile' (event) {
            Editor.log(`stop-compile`);
            stopCompilePrebuilt();
        }
    },
};