'use strict';

const IconvLite = require('iconv-lite');
const Path = require("path");
const Fs = require('fire-fs');

// only used on windows
let pyPath = Editor.url('unpack://utils/Python27/python');
let cocosConsoleRoot;
let cocosRoot;
let cocosConsoleBin;
let nativeLogPath;

var createPlatforms = function() {
    var platforms = [];

    if (process.platform === 'darwin') {
        platforms.push({
            value: 'ios',
            text: 'iOS'
        });
        platforms.push({
            value: 'mac',
            text: 'Mac'
        });
    } else if (process.platform === 'win32') {
        platforms.push({
            value: 'win32',
            text: 'Windows'
        });
    }
    platforms.push({
        value: 'android',
        text: 'Android'
    });
    return platforms;
};


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
        }
        else {
            // use the internal python on windows
            child = Spawn(pyPath, args, spawnOpts);
        }    
    }
    catch (err) {
        error = err;
    }

    return {error:error, child:child};
}

function initCocosBin () {
    let profileData = Editor.App._profile.data;

    cocosRoot = profileData['use-default-cpp-engine'] ? Editor.builtinCocosRoot : profileData['cpp-engine-path'];
    console.log('Cocos2dx root: ' + cocosRoot);

    if (cocosRoot.indexOf(' ') !== -1) {
        return new Error(`Cocos2dx root [${cocosRoot}] can\'t include space.`);
    }
    
    cocosConsoleRoot = Path.join(cocosRoot, 'tools/cocos2d-console/bin');

    if (process.platform === 'darwin') {
        cocosConsoleBin = Path.join(cocosConsoleRoot, 'cocos');
    }
    else {
        cocosConsoleBin = Path.join(cocosConsoleRoot, 'cocos.py');
    }

    return null;
}

function compilePrebuiltLibs () {
    //cjh let err = initCocosEnv();
    // if (err) {
    //     Editor.error(err);
    //     return;
    // }

    let args = ['gen-libs', '-m', 'release', '-p', 'android'];

    let spawnOpts = {
        // cwd: cocosConsoleRoot
    };

    Editor.log(`Start to compile cocos prebuilt libs`);//. The log file path [ ${nativeLogPath} ]`);

    Editor.Ipc.sendToMain('binary-creator:test', args, spawnOpts);

    // let ret = getCocosSpawnProcess(args, spawnOpts);
    // if (ret.error) {
    //     Editor.error(ret.error);
    //     return;
    // }

    // _prebuiltProcess = ret.child;

    // handleChildProcess(_prebuiltProcess, {
    //     logFilePath: nativeLogPath,
    //     disableEditorLog: !showLogInConsole
    // },
    // (err, code) => {
    //     if (err) {
    //         Editor.error(err);
    //         return;
    //     }

    //     if (code !== 0) {
    //         Editor.error( new Error(`Failed compile cocos prebuilt libs. The log file path [ ${nativeLogPath}]`) );
    //         return;
    //     }

    //     Editor.log('Success compile cocos prebuilt libs.');
    // });
}

var style = `
    :host {
        display: flex;
        flex-direction: column;
    }
    
    h2 {
        margin: 20px 20px 0 20px;
        font-size: 26px;
        color: #DDD;
    }
    
    section {
        margin: 10px 10px;
        padding: 0 10px;
        flex: 1;
        overflow-y: auto;
    }
    
    footer {
        padding: 10px 0;
        justify-content: flex-end;
    }
`;

var template = `
    <h2>生成预编译库</h2>

    <section>
        <ui-prop name="请选择平台"
            v-disabled=task==='compile'>
            <ui-select class="flex-1" v-value="selectedPlatform">
                <template v-for="item in platforms">
                    <option v-value="item.value">{{item.text}}</option>
                </template>
            </ui-select>
        </ui-prop>

        <ui-prop name="API Level"
            v-if="selectedPlatform === 'android'"
            v-disabled=task==='compile'>
            <ui-select class="flex-1" v-value="android.selectedAPILevel">
                <template v-for="item in android.apiLevels">
                    <option v-bind:value="item">{{item}}</option>
                </template>
            </ui-select>
        </ui-prop>

        <ui-prop name="APP ABI" auto-height
            v-if="selectedPlatform === 'android'"
            v-disabled=task==='compile'>
            <div class="flex-1 layout vertical">
                <ui-checkbox class="item" v-value="android.armeabi">
                    armeabi
                </ui-checkbox>
                <ui-checkbox class="item" v-value="android.armeabiV7a">
                    armeabi-v7a
                </ui-checkbox>
                <ui-checkbox class="item" v-value="android.arm64V8a">
                    arm64-v8a
                </ui-checkbox>
                <ui-checkbox class="item" v-value="android.x86">
                    x86
                </ui-checkbox>
            </div>
        </ui-prop>

        <ui-loader color="rgba(0,0,0,0.6)"
            v-if="task==='compile'">
            正在编译...
        </ui-loader>
    </section>

    <footer class="layout horizontal">
        <ui-button class="green"
            v-on:confirm="_onCompileClick"
            v-disabled=task==='compile'>
            编译
        </ui-button>
    </footer>
`;

Editor.Panel.extend({
    style: style,
    template: template,

    messages: {
    },

    ready() {
        Editor.log("ready...");

        var vm = this._vm = new window.Vue({
            el: this.shadowRoot,
            data: {
                platforms: createPlatforms(),
                selectedPlatform: '',
                task: '',
                android: {
                    apiLevels: [],
                    selectedAPILevel: '',
                    armeabi: true,
                    armeabiV7a: false,
                    arm64V8a: false,
                    x86: false
                },
                firstSelectAndroid: true
            },

            watch: {
                selectedPlatform: {
                    handler(val) {
                        if (val === 'android' && this.firstSelectAndroid) {
                            this.firstSelectAndroid = false;
                            this._firstSelectAndroid();
                        }
                    }
                }
            },

            methods: {
                _firstSelectAndroid() {

                    Editor.log(`_firstSelectAndroid`);
                    Editor.Ipc.sendToMain('app:query-android-apilevels', (error, list) => {
                        if (error)
                            return Editor.warn(err);

                        Editor.log(`query-android-apilevels: ${list}`);
                        list.forEach((item) => {
                            this.android.apiLevels.push(item);
                        });

                        if (list.length <= 0) {
                            return this.android.selectedAPILevel = '';
                        }

                        if (list.indexOf(this.android.selectedAPILevel) === -1) {
                            Editor.log(`current api: ${list[0]}`);
                            this.android.selectedAPILevel = list[0];
                        }
                    });

                    Editor.Profile.load('profile://global/settings.json', (err, profile) => {
                        if (err) {
                            Editor.error(`Get the build path failed. Please Build the project first.`);
                            return;
                        }

                        var useDefaultEngine = profile.data['use-default-cpp-engine'];
                        var userEnginePath = profile.data['cpp-engine-path'];
                        var builtinEnginePath = Path.join(Editor.url('app://'), '..', 'cocos2d-x');

                        Editor.log(`useDefaultEngine: ${useDefaultEngine}`);
                        Editor.log(`userEnginePath: ${userEnginePath}`);
                        Editor.log(`builtinEnginePath: ${builtinEnginePath}`);
                    });
                },

                _onOpenCompileLogFile(event) {
                    event.stopPropagation();
                    // Editor.Ipc.sendToMain('app:open-cocos-console-log');
                },

                startTask(task, options) {
                    this.task = task;
                    // // 将项目设置中的模块排除列表发给 Builder
                    // Editor.Profile.load('profile://project/project.json', (err, profile) => {
                    //     options.excludedModules = profile.data['excluded-modules'];
                    //     Editor.Ipc.sendToMain('builder:start-task', task, options);
                    // });
                },

                _onCompileClick(event) {
                    event.stopPropagation();
                    Editor.log(`_onCompileClick`);

                    if (this.selectedPlatform == '') {
                        Editor.error(`Please select a platform!`);
                        return
                    }

                    if (this.selectedPlatform === 'android') {
                        if (!this.android.armeabi && !this.android.armeabiV7a && !this.android.arm64V8a && !this.android.x86) {
                            Editor.error(`Please select an architecture!`)
                            return;
                        }
                    }
                    this.startTask('compile');

                    compilePrebuiltLibs()
                },

                _onStopCompileClick: function(event) {
                    event.stopPropagation();
                    Editor.log(`_onStopCompileClick`);
                    this.task = '';
                    // Editor.Ipc.sendToMain('app:stop-compile');
                }
            }
        });

        Editor.log("test");

    },
});