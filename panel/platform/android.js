'use strict';

const Fs = require('fs');
const Electron = require('electron');

exports.template = `
    <ui-prop name="${Editor.T('BUILDER.template')}">
        <ui-select class="flex-1" v-value="data.template">
            <template v-for="item in templates">
                <option v-bind:value="item">{{item}}</option>
            </template>
        </ui-select>
    </ui-prop>
    
    <ui-prop name="Android Studio">
        <ui-checkbox class="flex-1" v-value="data.androidStudio"></ui-checkbox>
    </ui-prop>
    
    <ui-prop name="${Editor.T('BUILDER.package_name')}">
        <ui-input class="flex-1" v-value="project.packageName"></ui-input>
    </ui-prop>

    <ui-prop name="API Level">
        <ui-select class="flex-1" v-value="data.apiLevel">
            <template v-for="item in apiLevels">
                <option v-bind:value="item">{{item}}</option>
            </template>
        </ui-select>
    </ui-prop>

    <ui-prop name="APP ABI" auto-height>
        <div class="flex-1 layout vertical">
            <ui-checkbox class="item" v-value="armeabi">
                armeabi
            </ui-checkbox>
            <ui-checkbox class="item" v-value="armeabiV7a">
                armeabi-v7a
            </ui-checkbox>
            <ui-checkbox class="item" v-value="arm64V8a">
                arm64-v8a
            </ui-checkbox>
            <ui-checkbox class="item" v-value="x86">
                x86
            </ui-checkbox>
        </div>
    </ui-prop>

    <ui-prop name="${Editor.T('KEYSTORE.keystore')}">
        <ui-checkbox v-value="data.useDebugKeystore">
            ${Editor.T('KEYSTORE.use_debug_keystore')}
        </ui-checkbox>
    </ui-prop>

    <!-- mi -->
    
    <ui-prop name="${Editor.T('KEYSTORE.keystore_path')}" v-disabled="data.useDebugKeystore">
        <div class="layout horizontal center flex-1">
            <ui-input class="flex-2" v-value="data.keystorePath"></ui-input>
            <ui-button class="tiny" v-on:confirm="_onChooseKeystoreClick">
                ···
            </ui-button>
            <ui-button class="tiny" v-on:confirm="_onShowKeystoreClick">
                ${Editor.T('SHARED.open')}
            </ui-button>
            <ui-button class="tiny" v-on:confirm="_onNewKeystoreClick">
                ${Editor.T('SHARED.new')}
            </ui-button>
        </div>
    </ui-prop>
    
    <ui-prop name="${Editor.T('KEYSTORE.keystore_password')}" v-disabled="data.useDebugKeystore">
        <ui-input class="flex-1" password v-value="data.keystorePassword"></ui-input>
    </ui-prop>
    
    <ui-prop name="${Editor.T('KEYSTORE.keystore_alias')}" v-disabled="data.useDebugKeystore">
        <ui-input class="flex-1" v-value="data.keystoreAlias"></ui-input>
    </ui-prop>
    
    <ui-prop name="${Editor.T('KEYSTORE.keystore_alias_password')}" v-disabled="data.useDebugKeystore">
        <ui-input class="flex-1" password v-value="data.keystoreAliasPassword"></ui-input>
    </ui-prop>

    <!-- mi -->

    <ui-prop name="${Editor.T('BUILDER.orientation')}" auto-height>
        <div class="flex-1 layout vertical">
            <ui-checkbox class="item" v-value="portrait">
                Portrait
            </ui-checkbox>
            <ui-checkbox class="item" v-value="upsideDown">
                Upside Down
            </ui-checkbox>
            <ui-checkbox class="item" v-value="landscapeLeft">
                Landscape Left
            </ui-checkbox>
            <ui-checkbox class="item" v-value="landscapeRight">
                Landscape Right
            </ui-checkbox>
        </div>
    </ui-prop>
`;

exports.props = {
    'data': null,
    'project': null
};

exports.data = function () {
    var orientation = this.project.orientation;
    return {
        portrait: orientation.portrait,
        upsideDown: orientation.upsideDown,
        landscapeLeft: orientation.landscapeLeft,
        landscapeRight: orientation.landscapeRight,
        templates: [],
        apiLevels: [],
        armeabi: this.data.appABIs.indexOf('armeabi') >= 0,
        armeabiV7a: this.data.appABIs.indexOf('armeabi-v7a') >= 0,
        arm64V8a: this.data.appABIs.indexOf('arm64-v8a') >= 0,
        x86: this.data.appABIs.indexOf('x86') >= 0
    };
};

exports.watch = {
    portrait: {
        handler (val) {
            if (!this.project) return;
            this.project.orientation.portrait = val;
        }
    },
    upsideDown: {
        handler (val) {
            if (!this.project) return;
            this.project.orientation.upsideDown = val;
        }
    },
    landscapeLeft: {
        handler (val) {
            if (!this.project) return;
            this.project.orientation.landscapeLeft = val;
        }
    },
    landscapeRight: {
        handler (val) {
            if (!this.project) return;
            this.project.orientation.landscapeRight = val;
        }
    },
    armeabi: {
        handler (val) {
            this._abiValueChanged('armeabi', val);
        }
    },
    armeabiV7a: {
        handler (val) {
            this._abiValueChanged('armeabi-v7a', val);
        }
    },
    arm64V8a: {
        handler (val) {
            this._abiValueChanged('arm64-v8a', val);
        }
    },
    x86: {
        handler (val) {
            this._abiValueChanged('x86', val);
        }
    }
};

exports.created = function () {

    Editor.log("android.js, created ...");
    Editor.Ipc.sendToMain('app:query-android-apilevels', (error, list) => {
        if (error)
            return Editor.warn(err);

        list.forEach((item) => {
            this.apiLevels.push(item);
        });

        if (!this.data) return;
        var apiLevel = this.data.apiLevel;
        if (list.length <= 0) {
            return this.data.apiLevel = '';
        }

        if (list.indexOf(apiLevel) === -1) {
            this.data.apiLevel = list[0];
        }
    });
};

exports.directives = {};

exports.methods = {
    _onChooseKeystoreClick (event) {
        event.stopPropagation();

        let res = Editor.Dialog.openFile({
            defaultPath: this.data.keystorePath || this.data.buildPath,
            properties: ['openFile'],
            filters: [
                { name: 'Keystore', extensions: ['keystore'] }
            ],
            title: 'Open Keystore'
        });

        if (res && res[0]) {
            this.data.keystorePath = res[0];
        }
    },

    _onShowKeystoreClick (event) {
        event.stopPropagation();

        if (!Fs.existsSync(this.data.keystorePath)) {
            Editor.warn('%s not exists!', this.data.keystorePath);
            return;
        }
        Electron.shell.showItemInFolder(this.data.keystorePath);
        Electron.shell.beep();
    },

    _onNewKeystoreClick: function (event) {
        event.stopPropagation();
        Editor.Ipc.sendToMain('keystore:open');
    },


    _abiValueChanged : function (abiName, selected ) {
        if (!this.data.appABIs) return;
        var idx = this.data.appABIs.indexOf(abiName);
        if (selected) {
            if (idx < 0) {
                this.data.appABIs.push(abiName);
            }
        } else {
            if (idx >= 0) {
                this.data.appABIs.splice(idx, 1);
            }
        }
    }
};