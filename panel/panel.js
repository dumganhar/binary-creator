'use strict';

const Path = require("path");
const Fs = require('fire-fs');

var createPlatforms = function() {
    var platforms = [];

    if (process.platform === 'darwin') {
        platforms.push({
            value: 'mac',
            text: 'Mac'
        });

        platforms.push({
            value: 'ios',
            text: 'iOS'
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

function compilePrebuiltLibs(platform, archs, androidApiLevel) {
    let args = ['gen-libs', '-m', 'release', '-p', platform];

    if (platform === 'android') {
        if (archs) {
            args.push('--app-abi');
            args.push(archs);
        }

        if (androidApiLevel) {
            args.push('--ap');
            args.push(androidApiLevel);
        }
    }

    Editor.log(`Start to compile cocos prebuilt libs`);
    Editor.Ipc.sendToMain('binary-creator:start-compile', args, {});
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
    <h2>${Editor.T('binary-creator.title')}</h2>

    <section>
        <ui-prop name="${Editor.T('binary-creator.select_platform')}">
            <ui-select class="flex-1" v-value="selectedPlatform"
            >
                <template v-for="item in platforms">
                    <option v-value="item.value">{{item.text}}</option>
                </template>
            </ui-select>
        </ui-prop>

        <ui-prop name="API Level"
            v-if="selectedPlatform === 'android'"
            >
            <ui-select class="flex-1" v-value="android.selectedAPILevel">
                <template v-for="item in android.apiLevels">
                    <option v-bind:value="item">{{item}}</option>
                </template>
            </ui-select>
        </ui-prop>

        <ui-prop name="APP ABI" auto-height
            v-if="selectedPlatform === 'android'"
            >
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

        <ui-loader id='loader' color="rgba(0,0,0,0.6)"
            >
            ${Editor.T('binary-creator.waiting')}
        </ui-loader>
    </section>

    <footer class="layout horizontal">
        <ui-button class="green"
            v-on:confirm="_onCompileClick"
            >
            ${Editor.T('binary-creator.compile')}
        </ui-button>
    </footer>
`;

Editor.Panel.extend({
    style: style,
    template: template,

    $: {
        loader: '#loader'
    },
    messages: {
        'binary-creator:onCompileSucceed' (event) {
            Editor.log("receive compile succeed event.");
            this.$loader.hidden = true;
        },
        'binary-creator:onCompileFailed' (event, errorStr) {
            Editor.log(`receive compile failed event, error: ${errorStr}`);
            this.$loader.hidden = true;
        }
    },

    ready: function() {
        Editor.log("binary-creator ready...");

        let loader = this.$loader;
        loader.hidden = true;

        let platforms = createPlatforms();
        var vm = this._vm = new window.Vue({
            el: this.shadowRoot,
            data: {
                platforms: platforms,
                selectedPlatform: platforms[0].value,
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
                },

                _onCompileClick(event) {
                    event.stopPropagation();
                    Editor.log(`_onCompileClick`);
                    let archs = [];

                    if (this.selectedPlatform == '') {
                        Editor.error(`Please select a platform!`);
                        return
                    }

                    if (this.selectedPlatform === 'android') {
                        if (!this.android.armeabi && !this.android.armeabiV7a && !this.android.arm64V8a && !this.android.x86) {
                            Editor.error(`Please select an architecture!`)
                            return;
                        }

                        if (this.android.armeabi)
                            archs.push('armeabi');
                        if (this.android.armeabiV7a)
                            archs.push('armeabi-v7a');
                        if (this.android.arm64V8a)
                            archs.push('arm64-v8a');
                        if (this.android.x86)
                            archs.push('x86');

                    }
                    loader.hidden = false;
                    compilePrebuiltLibs(this.selectedPlatform, archs.join(':'), this.android.selectedAPILevel);
                }
            }
        });
    },
    close: function() {
        Editor.log(`binary-creator, close ...`);
        Editor.Ipc.sendToMain('binary-creator:stop-compile');
    }
});